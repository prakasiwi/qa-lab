import { Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { deleteCustomer, getCustomers } from "../../api/customerApi";
import { useAllowedAction } from "../../auth/permissions";
import { ActionIconButton } from "../../components/ActionIconButton";
import { Alert } from "../../components/Alert";
import { DetailLink } from "../../components/DetailLink";
import { FilterToolbar } from "../../components/FilterToolbar";
import { Pagination } from "../../components/Pagination";
import { SortableHeader } from "../../components/SortableHeader";
import { DashboardLayout } from "../../layouts/DashboardLayout";
import { useTableSort } from "../../hooks/useTableSort";

export function CustomersPage() {
  const canView = useAllowedAction("customers:view");
  const canCreate = useAllowedAction("customers:create");
  const canUpdate = useAllowedAction("customers:update");
  const canDelete = useAllowedAction("customers:delete");
  const hasActions = canUpdate || canDelete;
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    search: "",
    status: "",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleting, setDeleting] = useState("");
  const { sort, sortedRows, toggleSort } = useTableSort(rows, (row) => ({
    customerCode: row.customerCode,
    customerName: row.customerName,
    email: row.email,
    phone: row.phone,
    status: row.isActive ? "ACTIVE" : "INACTIVE",
  }));
  const load = useCallback(() => {
    setLoading(true);
    return getCustomers(
      Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== ""),
      ),
    )
      .then((res) => {
        const data = res.data.data;
        setRows(data.items);
        setPagination({
          page: data.page,
          limit: data.limit,
          total: data.total,
        });
      })
      .catch((error) =>
        setApiError(error.response?.data?.message || error.message),
      )
      .finally(() => setLoading(false));
  }, [filters]);
  useEffect(() => {
    load();
  }, [load]);
  const filter = (patch) =>
    setFilters((current) => ({ ...current, page: 1, ...patch }));
  async function remove(row) {
    if (deleting || !window.confirm(`Delete customer ${row.customerCode}?`))
      return;
    setDeleting(row.id);
    setApiError("");
    setSuccess("");
    try {
      await deleteCustomer(row.id);
      setSuccess("Customer was deleted.");
      if (rows.length === 1 && filters.page > 1)
        setFilters((current) => ({ ...current, page: current.page - 1 }));
      else await load();
    } catch (error) {
      setApiError(
        error.response?.status === 409
          ? "This customer is used by an invoice and cannot be deleted. Set the customer to inactive instead."
          : error.response?.data?.message || error.message,
      );
    } finally {
      setDeleting("");
    }
  }
  return (
    <DashboardLayout>
      <div className="page-head">
        <div>
          <h1>Customers</h1>
        </div>
        {canCreate && (
          <Link className="primary icon-button" to="/customers/new">
            <Plus size={18} /> Create Customer
          </Link>
        )}
      </div>
      <Alert msg={apiError} />
      <Alert msg={success} type="success" />
      <FilterToolbar
        search={filters.search}
        onSearch={(search) => filter({ search })}
        placeholder="Search code, name, or email"
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
        <p className="muted">Loading customers...</p>
      ) : (
        <div className="table-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <SortableHeader
                    label="Customer Code"
                    sortKey="customerCode"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  <SortableHeader
                    label="Customer Name"
                    sortKey="customerName"
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
                    label="Phone"
                    sortKey="phone"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  <SortableHeader
                    label="Status"
                    sortKey="status"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  {hasActions ? <th>Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row) => (
                  <CustomerRow
                    key={row.id}
                    row={row}
                    canView={canView}
                    canUpdate={canUpdate}
                    canDelete={canDelete}
                    hasActions={hasActions}
                    deleting={deleting}
                    onDelete={remove}
                  />
                ))}
                {!rows.length && (
                  <tr>
                    <td
                      className="empty-table-cell"
                      colSpan={hasActions ? 6 : 5}
                    >
                      No customers available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            page={pagination.page}
            limit={pagination.limit}
            total={pagination.total}
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
export default CustomersPage;

function CustomerRow({
  row,
  canView,
  canUpdate,
  canDelete,
  hasActions,
  deleting,
  onDelete,
}) {
  const actions = hasActions ? (
    <td>
      <CustomerActions
        row={row}
        canUpdate={canUpdate}
        canDelete={canDelete}
        deleting={deleting}
        onDelete={onDelete}
      />
    </td>
  ) : null;
  return (
    <tr>
      <td>
        <DetailLink allowed={canView} to={`/customers/${row.id}`}>
          {row.customerCode}
        </DetailLink>
      </td>
      <td>{row.customerName}</td>
      <td>{row.email}</td>
      <td>{row.phone || "-"}</td>
      <td>
        <span
          className={`badge ${row.isActive ? "badge-active" : "badge-inactive"}`}
        >
          {row.isActive ? "ACTIVE" : "INACTIVE"}
        </span>
      </td>
      {actions}
    </tr>
  );
}

function CustomerActions({ row, canUpdate, canDelete, deleting, onDelete }) {
  return (
    <div className="table-actions">
      {canUpdate && (
        <ActionIconButton
          label="Edit Customer"
          icon={<Pencil size={18} aria-hidden="true" />}
          to={`/customers/${row.id}/edit`}
        />
      )}
      {canDelete && (
        <ActionIconButton
          label="Delete Customer"
          className="action-destructive"
          icon={<Trash2 size={18} aria-hidden="true" />}
          onClick={() => onDelete(row)}
          disabled={deleting === row.id}
        />
      )}
    </div>
  );
}
