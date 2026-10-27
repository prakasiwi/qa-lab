export function Field({ label, required, error, children, className = "" }) {
  return (
    <label className={`field ${className}`.trim()}>
      <span>
        {label} {required && <b>*</b>}
      </span>
      {children}
      {error && <small className="error">{error}</small>}
    </label>
  );
}
