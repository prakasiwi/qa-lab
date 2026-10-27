import { Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { deleteProduct, getProducts } from "../../api/productApi";
import { useAllowedAction } from "../../auth/permissions";
import { ActionIconButton } from "../../components/ActionIconButton";
import { Alert } from "../../components/Alert";
import { DetailLink } from "../../components/DetailLink";
import { FilterToolbar } from "../../components/FilterToolbar";
import { Pagination } from "../../components/Pagination";
import { SortableHeader } from "../../components/SortableHeader";
import { DashboardLayout } from "../../layouts/DashboardLayout";
import { useTableSort } from "../../hooks/useTableSort";
import { rupiah } from "../../utils/format";

export function ProductsPage() {
  const canView = useAllowedAction("products:view");
  const canCreate = useAllowedAction("products:create");
  const canUpdate = useAllowedAction("products:update");
  const canDelete = useAllowedAction("products:delete");
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
    productCode: row.productCode,
    productName: row.productName,
    price: row.price,
    initialStock: row.initialStock,
    availableStock: row.availableStock,
    status: row.isActive ? "ACTIVE" : "INACTIVE",
  }));
  const load = useCallback(() => {
    setLoading(true);
    return getProducts(
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
    if (deleting || !window.confirm(`Delete product ${row.productCode}?`))
      return;
    setDeleting(row.id);
    setApiError("");
    setSuccess("");
    try {
      await deleteProduct(row.id);
      setSuccess("Product was deleted.");
      if (rows.length === 1 && filters.page > 1)
        setFilters((current) => ({ ...current, page: current.page - 1 }));
      else await load();
    } catch (error) {
      setApiError(
        error.response?.status === 409
          ? "This product is used by an invoice and cannot be deleted."
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
          <h1>Products</h1>
        </div>
        {canCreate && (
          <Link className="primary icon-button" to="/products/new">
            <Plus size={18} /> Create Product
          </Link>
        )}
      </div>
      <Alert msg={apiError} />
      <Alert msg={success} type="success" />
      <FilterToolbar
        search={filters.search}
        onSearch={(search) => filter({ search })}
        placeholder="Search code or product name"
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
        <p className="muted">Loading products...</p>
      ) : (
        <div className="table-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <SortableHeader
                    label="Product Code"
                    sortKey="productCode"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  <SortableHeader
                    label="Product Name"
                    sortKey="productName"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  <SortableHeader
                    label="Price"
                    sortKey="price"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  <SortableHeader
                    label="Initial Stock"
                    sortKey="initialStock"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  <SortableHeader
                    label="Available Stock"
                    sortKey="availableStock"
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
                  <ProductRow
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
                      colSpan={hasActions ? 7 : 6}
                    >
                      No products available.
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
export default ProductsPage;

function ProductRow({
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
      <ProductActions
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
        <DetailLink allowed={canView} to={`/products/${row.id}`}>
          {row.productCode}
        </DetailLink>
      </td>
      <td>{row.productName}</td>
      <td>{rupiah(row.price)}</td>
      <td>{row.initialStock}</td>
      <td>{row.availableStock}</td>
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

function ProductActions({ row, canUpdate, canDelete, deleting, onDelete }) {
  return (
    <div className="table-actions">
      {canUpdate && (
        <ActionIconButton
          label="Edit Product"
          icon={<Pencil size={18} aria-hidden="true" />}
          to={`/products/${row.id}/edit`}
        />
      )}
      {canDelete && (
        <ActionIconButton
          label="Delete Product"
          className="action-destructive"
          icon={<Trash2 size={18} aria-hidden="true" />}
          onClick={() => onDelete(row)}
          disabled={deleting === row.id}
        />
      )}
    </div>
  );
}
