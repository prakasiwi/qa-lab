import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const page = readFileSync(
  new URL("../src/pages/ComingSoonPage.jsx", import.meta.url),
  "utf8",
);
const styles = readFileSync(
  new URL("../src/index.css", import.meta.url),
  "utf8",
);
const routes = readFileSync(
  new URL("../src/routes/AppRoutes.jsx", import.meta.url),
  "utf8",
);
const illustration = new URL(
  "../src/assets/in-development-warehouse.png",
  import.meta.url,
);

assert.ok(existsSync(illustration), "Missing In Development illustration asset.");
assert.match(
  page,
  /import warehouseIllustration from "\.\.\/assets\/in-development-warehouse\.png"/,
  "ComingSoonPage must import the warehouse illustration.",
);
assert.match(page, /className="in-development-page"/);
assert.match(page, /className="in-development-content"/);
assert.match(page, /src=\{warehouseIllustration\}/);
assert.match(
  routes,
  /path="\/suppliers"[\s\S]*?<ComingSoonPage moduleName="Suppliers" \/>/,
  "/suppliers must pass Suppliers to ComingSoonPage.",
);
assert.match(
  routes,
  /path="\/purchase-orders"[\s\S]*?<ComingSoonPage moduleName="Purchase Orders" \/>/,
  "/purchase-orders must pass Purchase Orders to ComingSoonPage.",
);
assert.match(page, /className="in-development-badge"/);
assert.match(page, /<h1[^>]*>Something new is on the way<\/h1>/);
assert.match(
  page,
  /We&apos;re working on the \{moduleName\} module\./,
);
assert.match(page, /Check back soon for updates\./);
assert.match(styles, /\.in-development-page\s*\{/);
assert.match(styles, /\.in-development-illustration\s*\{/);
assert.match(styles, /\.in-development-badge\s*\{/);
assert.match(styles, /width: min\(100%, 980px\);/);
assert.match(styles, /font-size: clamp\(36px, 3vw, 48px\);/);
assert.match(styles, /font-size: clamp\(18px, 1\.35vw, 22px\);/);
assert.match(
  styles,
  /@media \(max-width: 640px\)\s*\{[\s\S]*?\.in-development-page/,
);

console.log("In Development page checks passed.");
