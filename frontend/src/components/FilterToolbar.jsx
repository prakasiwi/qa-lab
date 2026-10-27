import { Filter, Search, X } from "lucide-react";
import { Children, cloneElement, isValidElement, useState } from "react";

export function FilterToolbar({
  search,
  onSearch,
  placeholder,
  activeCount,
  children,
  onApply,
  onClear,
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({});
  const openFilters = () => {
    setDraft({});
    setOpen((value) => !value);
  };
  const fields = Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    const fieldChildren = Children.map(child.props.children, (input) => {
      if (!isValidElement(input) || !input.props.name) return input;
      return cloneElement(input, {
        value: draft[input.props.name] ?? input.props.value,
        onChange: (event) =>
          setDraft((current) => ({
            ...current,
            [input.props.name]: event.target.value,
          })),
      });
    });
    return cloneElement(child, {}, fieldChildren);
  });
  const apply = () => {
    onApply?.(draft);
    setOpen(false);
  };
  const clear = () => {
    setDraft({});
    onClear();
  };
  return (
    <div className="list-toolbar">
      <button
        type="button"
        className="filter-trigger"
        onClick={openFilters}
        aria-expanded={open}
      >
        <Filter size={19} /> Filter
        {activeCount > 0 && <span>{activeCount}</span>}
      </button>
      <label className="list-search">
        <Search size={20} aria-hidden="true" />
        <input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder={placeholder}
        />
      </label>
      {open && (
        <section className="filter-popover" aria-label="Filters">
          <header>
            <h2>Filters</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close filters"
            >
              <X size={21} />
            </button>
          </header>
          <div className="filter-fields">{fields}</div>
          <footer>
            <button
              type="button"
              className="role-dialog-cancel"
              onClick={clear}
            >
              Clear
            </button>
            <button type="button" className="login-submit" onClick={apply}>
              Apply
            </button>
          </footer>
        </section>
      )}
    </div>
  );
}
