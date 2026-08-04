import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { swaggerSpec } from "./docs/swagger.js";
import authRoutes from "./modules/auth/auth.route.js";
import customerRoutes from "./modules/customers/customer.route.js";
import productRoutes from "./modules/products/product.route.js";
import invoiceRoutes from "./modules/invoices/invoice.route.js";
import dashboardRoutes from "./modules/dashboard/dashboard.route.js";
import { notFoundMiddleware } from "./middlewares/notFound.middleware.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";

const app = express();
const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const swaggerAssetsPath = path.resolve(currentDirectory, "../public/swagger");

function getPublicApiUrl(req) {
  const configuredUrl = process.env.PUBLIC_API_URL?.trim();
  if (configuredUrl) return configuredUrl;

  const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto || req.protocol;
  return `${protocol}://${req.get("host")}/api`;
}

function buildSwaggerSpec(req) {
  return {
    ...swaggerSpec,
    servers: [{ url: getPublicApiUrl(req) }],
  };
}

app.use(helmet());

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  }),
);

app.use(express.json());
app.use(morgan("dev"));

if (process.env.NODE_ENV !== "production") {
  app.use("/swagger", express.static(swaggerAssetsPath));
}

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "API is running",
  });
});

app.get(["/favicon.ico", "/favicon.png"], (req, res) => {
  res.status(204).end();
});

app.get("/api/docs/openapi.json", (req, res) => {
  res.json(buildSwaggerSpec(req));
});

app.get(["/api/docs", "/api/docs/"], (req, res) => {
  res
    .status(200)
    .type("html")
    .send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>QA Lab API Documentation</title>
    <link rel="stylesheet" href="/swagger/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="/swagger/swagger-ui-bundle.js"></script>
    <script src="/swagger/swagger-ui-standalone-preset.js"></script>
    <script src="/swagger/swagger-init.js"></script>
  </body>
</html>`);
});
app.use("/api/auth", authRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/products", productRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export { app };
export default app;
