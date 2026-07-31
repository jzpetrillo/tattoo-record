import crypto from "crypto";
import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { pool } from "./db";

const app = express();
const isDev = process.env.NODE_ENV === "development";

// Generate a cryptographic nonce for every request so the CSP header can
// reference it and inline scripts can carry the matching nonce attribute.
app.use((_req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString("base64");
  next();
});

// Advertise the reporting endpoint so browsers using the modern Reporting API
// know where to POST violation reports.  The group name "csp-endpoint" is
// referenced by the report-to CSP directive below.
app.use((_req, res, next) => {
  res.setHeader(
    "Reporting-Endpoints",
    `csp-endpoint="/api/csp-report"`,
  );
  next();
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        // Emit 'nonce-<value>' per request — no unsafe-inline needed.
        (_req: any, res: any) => `'nonce-${res.locals.nonce}'`,
        ...(isDev ? ["'unsafe-eval'"] : []),
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "data:",
      ],
      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "https://res.cloudinary.com",
        "https://ui-avatars.com",
        "https://picsum.photos",
        "https://fastly.picsum.photos",
        "https://api.dicebear.com",
        "https://commondatastorage.googleapis.com",
      ],
      mediaSrc: [
        "'self'",
        "blob:",
        "https://res.cloudinary.com",
        "https://commondatastorage.googleapis.com",
      ],
      connectSrc: [
        "'self'",
        "ws:",
        "wss:",
        "https://api.voyageai.com",
      ],
      frameAncestors: ["'none'"],
      // Modern Reporting API: references the "csp-endpoint" group declared in
      // the Reporting-Endpoints response header.  Browsers that support the
      // Reporting API (Chrome 96+, Edge 96+, Firefox/Safari catching up) will
      // use this and ignore report-uri.
      reportTo: "csp-endpoint",
      // Legacy fallback for browsers that haven't shipped the Reporting API yet.
      // Both directives are safe to send together.
      reportUri: ["/api/csp-report"],
    },
  },
}));

// Accept CSP violation reports from the browser.
// Two formats arrive here:
//   • Legacy (report-uri):  Content-Type: application/csp-report
//       Body: { "csp-report": { "blocked-uri": ..., "violated-directive": ... } }
//   • Modern (Reporting API, report-to): Content-Type: application/reports+json
//       Body: [ { "type": "csp-violation", "url": ..., "body": { "blockedURL": ..., "effectiveDirective": ... } } ]
// Register the route early so it runs before the global JSON body-parser.
app.post(
  "/api/csp-report",
  express.json({
    type: [
      "application/json",
      "application/csp-report",
      "application/reports+json",
    ],
  }),
  async (req: Request, res: Response) => {
    const userAgent = req.headers["user-agent"] ?? null;
    const contentType = req.headers["content-type"] ?? "";

    // Normalise both wire formats into a common shape for logging/persistence.
    type NormalisedReport = {
      blockedUri: string | null;
      violatedDirective: string | null;
      documentUri: string | null;
      referrer: string | null;
      originalPolicy: string | null;
    };

    const normalise = (body: any): NormalisedReport[] => {
      if (contentType.includes("application/reports+json")) {
        // Modern Reporting API — body is an array of report objects.
        const entries: any[] = Array.isArray(body) ? body : [body];
        return entries
          .filter((e: any) => e?.type === "csp-violation")
          .map((e: any) => ({
            blockedUri: e.body?.["blockedURL"] ?? e.body?.["blocked-uri"] ?? null,
            violatedDirective:
              e.body?.["effectiveDirective"] ??
              e.body?.["violated-directive"] ??
              null,
            documentUri: e.body?.["documentURL"] ?? e.body?.["document-uri"] ?? e.url ?? null,
            referrer: e.body?.["referrer"] ?? null,
            originalPolicy: e.body?.["originalPolicy"] ?? e.body?.["original-policy"] ?? null,
          }));
      }

      // Legacy application/csp-report format.
      const report = body?.["csp-report"] ?? body;
      return [
        {
          blockedUri: report?.["blocked-uri"] ?? null,
          violatedDirective: report?.["violated-directive"] ?? null,
          documentUri: report?.["document-uri"] ?? null,
          referrer: report?.["referrer"] ?? null,
          originalPolicy: report?.["original-policy"] ?? null,
        },
      ];
    };

    const reports = normalise(req.body);

    for (const { blockedUri, violatedDirective, documentUri, referrer, originalPolicy } of reports) {
      log(
        `[CSP violation] blocked-uri="${blockedUri ?? "unknown"}" ` +
        `violated-directive="${violatedDirective ?? "unknown"}" ` +
        `document-uri="${documentUri ?? "unknown"}"`,
      );
      if (isDev) {
        console.warn("[CSP violation full report]", JSON.stringify(req.body, null, 2));
      }

      // Persist to database so violations are visible in the admin dashboard.
      try {
        await pool.query(
          `INSERT INTO csp_violations
            (blocked_uri, violated_directive, document_uri, referrer, original_policy, user_agent)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [blockedUri, violatedDirective, documentUri, referrer, originalPolicy, userAgent],
        );
      } catch (err) {
        // Non-fatal — log but don't fail the 204 response.
        console.error("[CSP violation] failed to persist report:", err);
      }
    }

    res.status(204).end();
  },
);

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      // Do not log response bodies for auth routes to avoid token/credential leakage
      const isSensitivePath = path.startsWith("/api/auth");
      if (capturedJsonResponse && !isSensitivePath) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    let message: string;
    if (status >= 500) {
      message = "Internal Server Error";
    } else if (err.name === "ZodError") {
      message = err.errors?.[0]?.message || "Validation failed";
    } else {
      message = err.message || "Bad Request";
    }
    console.error(`[error] ${err.message}`, err.stack);
    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
