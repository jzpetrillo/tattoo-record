import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    const nonce = res.locals.nonce as string;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      let page = await vite.transformIndexHtml(url, template);
      // Stamp every inline <script> with the per-request nonce so the CSP
      // allows Vite's injected module-preload scripts without unsafe-inline.
      page = page.replace(/<script/g, `<script nonce="${nonce}"`);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Serve all static assets (JS, CSS, images…) but disable the default index
  // fallback so that requests for "/" and "/index.html" fall through to the
  // catch-all below, which injects the per-request CSP nonce before sending.
  app.use(express.static(distPath, { index: false }));

  // Cache the built index.html once at startup, then stamp each response with
  // the per-request nonce so inline scripts (e.g. Vite module-preload) are
  // allowed by the CSP without needing 'unsafe-inline'.
  const indexHtmlTemplate = fs.readFileSync(
    path.resolve(distPath, "index.html"),
    "utf-8",
  );

  app.use("*", (_req, res) => {
    const nonce = res.locals.nonce as string;
    const html = indexHtmlTemplate.replace(/<script/g, `<script nonce="${nonce}"`);
    res.status(200).set({ "Content-Type": "text/html" }).end(html);
  });
}
