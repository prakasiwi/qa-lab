import {
  permissionActionId,
  updatePermissionSelection,
} from "./permissionMatrixState";

export function PermissionMatrix({
  catalog,
  selected,
  onChange,
  readOnly = false,
}) {
  function toggle(row, actionKey, checked) {
    if (readOnly || !row.isActive || !row.isRegistered) return;
    onChange(
      updatePermissionSelection({
        row,
        selected,
        actionKey,
        checked,
        confirmClear: () =>
          window.confirm(
            "Clearing View will also clear the other selected actions for this resource. Continue?",
          ),
      }),
    );
  }

  return (
    <div className="table-wrap permission-matrix-wrap">
      <table className="permission-matrix">
        <thead>
          <tr>
            <th>No</th>
            <th>Menu</th>
            <th>Submenu</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {catalog.map((row, index) => {
            const available = row.isActive && row.isRegistered;
            return (
              <tr
                key={row.resourceKey}
                className={available ? "" : "permission-row-disabled"}
              >
                <td>{index + 1}</td>
                <td>{row.menuLabel}</td>
                <td>{row.submenuLabel || "-"}</td>
                <td>
                  <div className="permission-action-list">
                    {row.actions.map((action) => (
                      <label
                        key={action.key}
                        className="permission-action-choice"
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(
                            permissionActionId(row.resourceKey, action.key),
                          )}
                          disabled={readOnly || !available}
                          onChange={(event) =>
                            toggle(row, action.key, event.target.checked)
                          }
                        />
                        <span>{action.label}</span>
                      </label>
                    ))}
                    {!available && <small>Unavailable</small>}
                  </div>
                </td>
              </tr>
            );
          })}
          {!catalog.length && (
            <tr>
              <td className="empty-table-cell" colSpan="4">
                No permission resources available.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
