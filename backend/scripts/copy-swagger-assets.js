import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

const swaggerDistPackagePath = require.resolve("swagger-ui-dist/package.json");
const swaggerDistDirectory = path.dirname(swaggerDistPackagePath);
const targetDirectory = path.resolve(process.cwd(), "public/swagger");

const assets = [
  "swagger-ui.css",
  "swagger-ui-bundle.js",
  "swagger-ui-standalone-preset.js",
];

async function copySwaggerAssets() {
  await mkdir(targetDirectory, { recursive: true });

  await Promise.all(
    assets.map((filename) =>
      copyFile(
        path.join(swaggerDistDirectory, filename),
        path.join(targetDirectory, filename),
      ),
    ),
  );

  console.log(`Swagger UI assets copied to ${targetDirectory}`);
}

copySwaggerAssets().catch((error) => {
  console.error("Failed to copy Swagger UI assets:", error);
  process.exit(1);
});
