import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const toolbar = readFileSync(
  new URL("../src/components/FilterToolbar.jsx", import.meta.url),
  "utf8",
);
const styles = readFileSync(
  new URL("../src/index.css", import.meta.url),
  "utf8",
);

assert.match(toolbar, /className="list-search"/);
assert.match(toolbar, /aria-label=\{placeholder\}/);
assert.match(toolbar, /aria-label="Clear search"/);
assert.match(toolbar, /onClick=\{\(\) => onSearch\(""\)\}/);
assert.match(styles, /\.list-search\s*\{[\s\S]*?min-height: 44px;/);
assert.match(styles, /\.filter-trigger\s*\{[\s\S]*?min-height: 44px;/);
assert.match(styles, /\.list-search:focus-within\s*\{[\s\S]*?box-shadow: var\(--focus-ring\);/);
assert.match(styles, /\.list-search input:focus\s*\{[\s\S]*?outline: 0;/);
assert.match(styles, /\.list-search-clear\s*\{/);

console.log("Shared list search checks passed.");
