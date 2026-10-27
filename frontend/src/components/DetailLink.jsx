import { Link } from "react-router-dom";

/** Keeps identity links consistent while respecting the view permission. */
export function DetailLink({ allowed, to, children, className = "" }) {
  if (!allowed) return <span>{children}</span>;
  return (
    <Link className={`detail-link ${className}`.trim()} to={to}>
      {children}
    </Link>
  );
}
