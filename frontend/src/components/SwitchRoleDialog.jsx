import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { roles, switchRole } from "../api/authApi";
import { authSession } from "../auth/authSession";
import { firstAllowedPath } from "../utils/authDestination";
import { getErrorMessage } from "../utils/apiErrors";
import { switchRoleState } from "../auth/loginFlow";

function initials(name) {
  return (name || "User")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function SwitchRoleDialog({
  open,
  currentRole,
  user,
  onClose,
  onSwitched,
  openerRef,
}) {
  const [availableRoles, setAvailableRoles] = useState([]);
  const [roleId, setRoleId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const dialogRef = useRef(null);
  const selectRef = useRef(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    const opener = openerRef?.current;
    closeButtonRef.current?.focus();
    setError("");
    setRoleId("");
    setLoading(true);
    roles()
      .then((response) => {
        if (active)
          setAvailableRoles(
            [...response.data.data].sort((a, b) =>
              (a.name || a.code).localeCompare(b.name || b.code),
            ),
          );
      })
      .catch((requestError) => {
        if (active)
          setError(
            getErrorMessage(requestError, "Unable to load available roles."),
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    const keyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const controls = dialogRef.current?.querySelectorAll(
        'button:not([disabled]), select:not([disabled]), [href]:not([tabindex="-1"])',
      );
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", keyDown);
    return () => {
      active = false;
      window.removeEventListener("keydown", keyDown);
      opener?.focus();
    };
  }, [onClose, open, openerRef]);

  useEffect(() => {
    if (open && !loading && availableRoles.length) selectRef.current?.focus();
  }, [availableRoles.length, loading, open]);
  if (!open) return null;
  const submit = async (event) => {
    event.preventDefault();
    if (!roleId || loading) return;
    const nextState = switchRoleState("start");
    setLoading(nextState.loading);
    setError(nextState.error);
    try {
      await switchRole({ roleId });
      const user = await authSession.establish({ roleSwitch: true });
      if (!user)
        throw new Error(
          "Your role could not be refreshed. Please sign in again.",
        );
      onSwitched(firstAllowedPath(user));
    } catch (requestError) {
      const nextState = switchRoleState("failure");
      setError(getErrorMessage(requestError, nextState.error));
      setLoading(nextState.loading);
    }
  };
  return (
    <div
      className="role-dialog-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        ref={dialogRef}
        className="role-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="switch-role-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="role-dialog-header">
          <h2 id="switch-role-title">Switch Role</h2>
          <button
            ref={closeButtonRef}
            type="button"
            className="role-dialog-close"
            onClick={onClose}
            aria-label="Close switch role dialog"
          >
            <X size={26} strokeWidth={1.8} />
          </button>
        </header>
        <div className="role-dialog-profile">
          <span className="role-dialog-avatar" aria-hidden="true">
            {initials(user?.name)}
          </span>
          <div>
            <strong>{user?.name || "Current user"}</strong>
            <span>{user?.email || "—"}</span>
          </div>
        </div>
        <p className="role-dialog-current">
          Current role: <strong>{currentRole || "Current role"}</strong>
        </p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {loading && !availableRoles.length ? (
          <p role="status">Loading roles...</p>
        ) : availableRoles.length === 0 ? (
          <p>No other roles available.</p>
        ) : (
          <form className="auth-form role-dialog-form" onSubmit={submit}>
            <label className="field" htmlFor="switch-role">
              <span>
                Role <b>*</b>
              </span>
              <select
                ref={selectRef}
                id="switch-role"
                value={roleId}
                onChange={(event) => setRoleId(event.target.value)}
                required
              >
                <option value="">Select role</option>
                {availableRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name || role.code}
                  </option>
                ))}
              </select>
            </label>
            <div className="role-dialog-actions">
              <button
                type="button"
                className="role-dialog-cancel"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="login-submit"
                disabled={loading || !roleId}
              >
                {loading ? "Switching..." : "Switch Role"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
