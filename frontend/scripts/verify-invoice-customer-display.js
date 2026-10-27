import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../src/pages/invoices/InvoicesPage.jsx", import.meta.url),
  "utf8",
);

assert.match(
  source,
  /row\.customer\?\.name/,
  "Invoice list must render the customer name returned by the API.",
);
