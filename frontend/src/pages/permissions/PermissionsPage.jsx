import axios from "axios";
import { Pencil, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getPermissions } from "../../api/permissionApi";
import { useAllowedAction } from "../../auth/permissions";
import { Alert } from "../../components/Alert";
import { ActionIconButton } from "../../components/ActionIconButton";
import { DetailLink } from "../../components/DetailLink";
import { FilterToolbar } from "../../components/FilterToolbar";
import { Pagination } from "../../components/Pagination";
import { SortableHeader } from "../../components/SortableHeader";
import { DashboardLayout } from "../../layouts/DashboardLayout";
import { useTableSort } from "../../hooks/useTableSort";
import { getErrorMessage, isForbiddenError } from "../../utils/apiErrors";

export function PermissionsPage() {
  const navigate = useNavigate();
  const canManage = useAllowedAction("iam_permissions:manage");
  const canView = useAllowedAction("iam_permissions:view");
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    search: "",
    status: "",
  });
  const [result, setResult] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const { sort, sortedRows, toggleSort } = useTableSort(
    result.items,
    (row) => ({
      code: row.code,
      name: row.name,
      description: row.description,
      status: row.isActive ? "ACTIVE" : "INACTIVE",
      assignedUsers: row.assignedUsers,
    }),
  );

  useEffect(() => {
    const controller = new AbortController();
    const current = ++generation.current;
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      getPermissions(
        Object.fromEntries(
          Object.entries(filters).filter(([, value]) => value !== ""),
        ),
        { signal: controller.signal },
      )
        .then(({ data }) => {
          if (current === generation.current) setResult(data.data);
        })
        .catch((requestError) => {
          if (current !== generation.current || axios.isCancel(requestError))
            return;
          setResult({ items: [], total: 0 });
          if (isForbiddenError(requestError))
            navigate("/forbidden", { replace: true });
          else
            setError(
              getErrorMessage(requestError, "Unable to load permissions."),
            );
        })
        .finally(() => {
          if (current === generation.current) setLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [filters, navigate]);

  const filter = (patch) =>
    setFilters((current) => ({ ...current, page: 1, ...patch }));

  return (
    <DashboardLayout>
      <div className="breadcrumb">IAM / Permission</div>
      <div className="page-head">
        <div>
          <h1>Permission</h1>
        </div>
        {canManage && (
          <Link className="primary icon-button" to="/permissions/new">
            <Plus size={18} /> Create Permission
          </Link>
        )}
      </div>
      <Alert msg={error} />
      <FilterToolbar
        search={filters.search}
        onSearch={(search) => filter({ search })}
        placeholder="Search code or permission name"
        activeCount={filters.status ? 1 : 0}
        onApply={filter}
        onClear={() => filter({ search: "", status: "" })}
      >
        <label className="field">
          <span>Status</span>
          <select
            name="status"
            value={filters.status}
            onChange={(event) => filter({ status: event.target.value })}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
      </FilterToolbar>
      {loading ? (
        <p role="status" className="muted">
          Loading permissions…
        </p>
      ) : (
        <div className="table-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <SortableHeader
                    label="Permission Code"
                    sortKey="code"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  <SortableHeader
                    label="Permission Name"
                    sortKey="name"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  <SortableHeader
                    label="Description"
                    sortKey="description"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  <SortableHeader
                    label="Status"
                    sortKey="status"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  <SortableHeader
                    label="Assigned Users"
                    sortKey="assignedUsers"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  {canManage && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((permission) => (
                  <tr key={permission.id}>
                    <td>
                      <DetailLink
                        allowed={canView}
                        to={`/permissions/${permission.id}`}
                      >
                        {permission.code}
                      </DetailLink>
                    </td>
                    <td>{permission.name}</td>
                    <td>{permission.description || "-"}</td>
                    <td>
                      <span
                        className={`badge ${permission.isActive ? "status-active" : "status-inactive"}`}
                      >
                        {permission.isActive ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                    <td>{permission.assignedUsers}</td>
                    {canManage && (
                      <td>
                        <div className="table-actions">
                          <ActionIconButton
                            label="Edit Permission"
                            icon={<Pencil size={18} aria-hidden="true" />}
                            to={`/permissions/${permission.id}/edit`}
                          />
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {!result.items.length && (
                  <tr>
                    <td
                      className="empty-table-cell"
                      colSpan={canManage ? 6 : 5}
                    >
                      No permissions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            page={filters.page}
            limit={filters.limit}
            total={result.total}
            onPageChange={(page) =>
              setFilters((current) => ({ ...current, page }))
            }
            onLimitChange={(limit) => filter({ limit })}
          />
        </div>
      )}
    </DashboardLayout>
  );
}
