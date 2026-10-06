import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();
app.set("trust proxy", 1);
app.disable("etag");

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
const allowedOrigins = [
  ...(process.env.APP_URL ? [new URL(process.env.APP_URL).origin] : []),
  ...(process.env.REPLIT_DEV_DOMAIN ? [`https://${process.env.REPLIT_DEV_DOMAIN}`] : []),
];
app.use(cors({ origin: allowedOrigins, credentials: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
app.use("/api", router);

export default app;
