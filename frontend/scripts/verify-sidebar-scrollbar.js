import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const styles = readFileSync(
  new URL("../src/index.css", import.meta.url),
  "utf8",
);

assert.match(styles, /\.sidebar-nav\s*\{[\s\S]*?overflow-y: auto;/);
assert.match(styles, /\.sidebar-nav\s*\{[\s\S]*?scrollbar-width: thin;/);
assert.match(styles, /\.sidebar-nav::-webkit-scrollbar\s*\{/);
assert.match(styles, /\.sidebar-nav::-webkit-scrollbar-thumb\s*\{/);
assert.match(styles, /\.sidebar-nav::-webkit-scrollbar-track\s*\{/);

console.log("Sidebar scrollbar checks passed.");
