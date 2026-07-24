import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sidebar = readFileSync(resolve('src/components/Sidebar.jsx'), 'utf8');
const apiClient = readFileSync(resolve('src/api/apiClient.js'), 'utf8');
const envExample = readFileSync(resolve('.env.example'), 'utf8');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(sidebar.includes('VITE_API_DOCS_URL?.trim()'), 'API docs URL must use VITE_API_DOCS_URL without localhost fallback.');
assert(!sidebar.includes('localhost:3001/api/docs'), 'Sidebar must not hardcode localhost Swagger URL.');
assert(apiClient.includes('VITE_API_BASE_URL?.trim()'), 'API client must read VITE_API_BASE_URL from env.');
assert(!apiClient.includes("|| 'http://localhost:3001/api'"), 'API client must not fallback to localhost in production code.');
assert(sidebar.includes('target="_blank"'), 'API Documentation link must open in a new tab.');
assert(sidebar.includes('rel="noopener noreferrer"'), 'API Documentation link must use noopener noreferrer.');
assert(sidebar.includes('sidebar-external-link'), 'API Documentation link must have sidebar-external-link class.');
assert(sidebar.includes('sidebar-item-disabled'), 'Missing disabled state class for unconfigured URL.');
assert(sidebar.includes('aria-disabled={!apiDocsUrl}'), 'Missing aria-disabled binding.');
assert(sidebar.includes('window.alert("API Documentation URL belum dikonfigurasi.")'), 'Missing feedback when API docs URL is not configured.');
assert(sidebar.includes('event.preventDefault()'), 'Missing navigation prevention for empty API docs URL.');
assert(sidebar.includes('onCloseMobile();'), 'Valid API docs click must close mobile drawer.');
assert(sidebar.includes('<BookOpen size={20} />'), 'Expanded/collapsed menu must render BookOpen icon.');
assert(sidebar.includes('<ExternalLink size={18} className="sidebar-external-icon"'), 'Expanded menu must render a sidebar-sized external link icon.');
assert(sidebar.includes('!displayCollapsed &&'), 'Collapsed sidebar must hide API Documentation label and external icon.');
assert(!sidebar.includes('navigate(apiDocsUrl'), 'API Documentation must not use internal route navigation.');

const invoicesIndex = sidebar.indexOf('<span>Invoices</span>');
const docsIndex = sidebar.indexOf('<span>API Documentation</span>');
const logoutIndex = sidebar.indexOf('aria-label="Logout"');
assert(invoicesIndex !== -1 && docsIndex !== -1 && logoutIndex !== -1, 'Invoices, API Documentation, and Logout must exist.');
assert(invoicesIndex < docsIndex, 'API Documentation menu must be placed after Invoices.');
assert(docsIndex < logoutIndex, 'API Documentation menu must be placed before Logout.');

assert(envExample.includes('VITE_API_DOCS_URL='), '.env.example must document VITE_API_DOCS_URL.');
assert(envExample.includes('https://qa-lab-api.com/api/docs/'), '.env.example must include production HTTPS API docs example.');

console.log('API Documentation sidebar checks passed.');
