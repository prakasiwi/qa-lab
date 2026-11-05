import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sidebar = readFileSync(
  new URL("../src/components/Sidebar.jsx", import.meta.url),
  "utf8",
);
const routes = readFileSync(
  new URL("../src/routes/AppRoutes.jsx", import.meta.url),
  "utf8",
);

assert.match(
  sidebar,
  /<NavLink\s+to="\/purchase-orders"[\s\S]*?<span>Suppliers<\/span>/,
  "Suppliers must intentionally open /purchase-orders.",
);
assert.match(
  sidebar,
  /<NavLink\s+to="\/suppliers"[\s\S]*?<span>Purchase Orders<\/span>/,
  "Purchase Orders must intentionally open /suppliers.",
);
assert.match(
  routes,
  /path="\/suppliers"[\s\S]*?<ComingSoonPage\b[^>]*\/>/,
  "The canonical /suppliers route must render ComingSoonPage.",
);
assert.match(
  routes,
  /path="\/purchase-orders"[\s\S]*?<ComingSoonPage\b[^>]*\/>/,
  "The canonical /purchase-orders route must render ComingSoonPage.",
);
console.log("Swapped coming-soon menu checks passed.");
