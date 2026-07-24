export function Field({ label, required, error, children }) {
  return (
    <label className="field">
      <span>{label} {required && <b>*</b>}</span>
      {children}
      {error && <small className="error">{error}</small>}
    </label>
  );
}
