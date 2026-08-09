import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function Pagination({ page, limit, total, onPageChange, onLimitChange }) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(total, page * limit);

  return (
    <div className="pagination-bar">
      <div className="pagination-summary">
        Showing {start}-{end} of {total} items
      </div>
      <div className="pagination-controls">
        <label className="pagination-size">
          <span>Rows per page:</span>
          <select value={limit} onChange={(event) => onLimitChange(Number(event.target.value))}>
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <div className="pagination-pages">
          <button type="button" className="pagination-icon-button" onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
            <ChevronLeft size={18} />
          </button>
          <button type="button" className="pagination-page-button" aria-current="page">
            {page}
          </button>
          <button type="button" className="pagination-icon-button" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} aria-label="Next page">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
