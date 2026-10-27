import axios from "axios";
import { Pencil, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAccessOptions, getUsers } from "../../api/userApi";
import { useAllowedAction } from "../../auth/permissions";
import { ActionIconButton } from "../../components/ActionIconButton";
import { Alert } from "../../components/Alert";
import { DetailLink } from "../../components/DetailLink";
import { FilterToolbar } from "../../components/FilterToolbar";
import { Pagination } from "../../components/Pagination";
import { SortableHeader } from "../../components/SortableHeader";
import { useTableSort } from "../../hooks/useTableSort";
import { DashboardLayout } from "../../layouts/DashboardLayout";
import { getErrorMessage, isForbiddenError } from "../../utils/apiErrors";

const statuses = [
  "PENDING_VERIFICATION",
  "PENDING_ACTIVATION",
  "ACTIVE",
  "INACTIVE",
  "LOCKED",
];
const initialFilters = {
  page: 1,
  limit: 10,
  search: "",
  status: "",
  role: "",
  mfaEnabled: "",
  verified: "",
};

export function UsersPage() {
  const navigate = useNavigate();
  const canManageUsers = useAllowedAction("iam_users:manage");
  const canManagePermissions = useAllowedAction("iam_permissions:manage");
  const canManage = canManageUsers && canManagePermissions;
  const canView = useAllowedAction("iam_users:view");
  const [filters, setFilters] = useState(initialFilters);
  const [result, setResult] = useState({ items: [], total: 0 });
  const [roleOptions, setRoleOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const { sort, sortedRows, toggleSort } = useTableSort(
    result.items,
    (row) => ({
      name: row.name,
      email: row.email,
      status: row.status,
      roles: row.accesses
        .filter((access) => access.isActive)
        .map((access) => access.role.name)
        .join(", "),
      mfa: row.mfaEnabled ? "Required" : "Not required",
    }),
  );

  useEffect(() => {
    const controller = new AbortController();
    const current = ++generation.current;
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      getUsers(
        Object.fromEntries(
          Object.entries(filters).filter(([, value]) => value !== ""),
        ),
        { signal: controller.signal },
      )
        .then(({ data }) => {
          if (current === generation.current) setResult(data.data);
        })
        .catch((requestError) => {
          if (current === generation.current && !axios.isCancel(requestError)) {
            setResult({ items: [], total: 0 });
            if (isForbiddenError(requestError))
              navigate("/forbidden", { replace: true });
            else
              setError(getErrorMessage(requestError, "Unable to load users."));
          }
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

  useEffect(() => {
    let active = true;
    getAccessOptions()
      .then(({ data }) => {
        if (active) setRoleOptions(data.data.roles || []);
      })
      .catch(() => {
        if (active) setRoleOptions([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const filter = (patch) =>
    setFilters((value) => ({ ...value, page: 1, ...patch }));
  const activeCount = ["status", "role", "mfaEnabled", "verified"].filter(
    (key) => filters[key] !== "",
  ).length;

  return (
    <DashboardLayout>
      <div className="breadcrumb">IAM / Users</div>
      <div className="page-head">
        <div>
          <h1>Users</h1>
        </div>
        {canManage && (
          <Link className="primary icon-button" to="/users/new">
            <Plus size={18} /> Invite User
          </Link>
        )}
      </div>
      <Alert msg={error} />
      <FilterToolbar
        search={filters.search}
        onSearch={(search) => filter({ search })}
        placeholder="Search name, email, or phone"
        activeCount={activeCount}
        onApply={filter}
        onClear={() => setFilters(initialFilters)}
      >
        <label className="field">
          <span>Status</span>
          <select name="status" value={filters.status}>
            <option value="">All statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Role</span>
          <select name="role" value={filters.role}>
            <option value="">All roles</option>
            {roleOptions.map((role) => (
              <option key={role.id} value={role.code}>
                {role.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>MFA</span>
          <select name="mfaEnabled" value={filters.mfaEnabled}>
            <option value="">All</option>
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </label>
        <label className="field">
          <span>Email Verification</span>
          <select name="verified" value={filters.verified}>
            <option value="">All</option>
            <option value="true">Verified</option>
            <option value="false">Not verified</option>
          </select>
        </label>
      </FilterToolbar>
      {loading ? (
        <p role="status">Loading users...</p>
      ) : (
        <div className="table-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <SortableHeader
                    label="Name"
                    sortKey="name"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  <SortableHeader
                    label="Email"
                    sortKey="email"
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
                    label="Roles"
                    sortKey="roles"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  <SortableHeader
                    label="MFA"
                    sortKey="mfa"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  {canManage && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.name}</strong>
                    </td>
                    <td>
                      <DetailLink allowed={canView} to={`/users/${user.id}`}>
                        {user.email}
                      </DetailLink>
                    </td>
                    <td>
                      <span
                        className={`badge status-${user.status.toLowerCase()}`}
                      >
                        {user.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td>
                      {user.accesses
                        .filter((access) => access.isActive)
                        .map((access) => access.role.name)
                        .join(", ") || "-"}
                    </td>
                    <td>{user.mfaEnabled ? "Required" : "Not required"}</td>
                    {canManage && (
                      <td>
                        <div className="table-actions">
                          <ActionIconButton
                            label="Edit User"
                            icon={<Pencil size={18} aria-hidden="true" />}
                            to={`/users/${user.id}/edit`}
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
                      No users found.
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
            onPageChange={(page) => setFilters((value) => ({ ...value, page }))}
            onLimitChange={(limit) => filter({ limit })}
          />
        </div>
      )}
    </DashboardLayout>
  );
}
