import { useId, useState } from "react";
import { Link } from "react-router-dom";

/** A compact, accessible action used in table rows. */
export function ActionIconButton({
  label,
  icon,
  to,
  className = "",
  disabled = false,
  ...props
}) {
  const tooltipId = useId();
  const [visible, setVisible] = useState(false);
  const commonProps = {
    className: `action-icon-button ${className}`.trim(),
    "aria-label": label,
    "aria-describedby": visible ? tooltipId : undefined,
    onFocus: () => setVisible(true),
    onBlur: () => setVisible(false),
    onMouseEnter: () => setVisible(true),
    onMouseLeave: () => setVisible(false),
    onKeyDown: (event) => {
      if (event.key === "Escape") {
        setVisible(false);
        event.currentTarget.blur();
      }
      props.onKeyDown?.(event);
    },
  };

  const control =
    to && !disabled ? (
      <Link to={to} {...commonProps}>
        {icon}
      </Link>
    ) : (
      <button type="button" disabled={disabled} {...props} {...commonProps}>
        {icon}
      </button>
    );

  return (
    <span className="action-icon-control">
      {control}
      {visible && (
        <span id={tooltipId} role="tooltip" className="action-tooltip">
          {label}
        </span>
      )}
    </span>
  );
}
