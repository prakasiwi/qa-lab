import { Check, CircleSlash, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  cancelInvoice,
  getInvoices,
  submitInvoice,
} from "../../api/invoiceApi";
import { getCustomers } from "../../api/customerApi";
import { Alert } from "../../components/Alert";
import { ActionIconButton } from "../../components/ActionIconButton";
import { DetailLink } from "../../components/DetailLink";
import { FilterToolbar } from "../../components/FilterToolbar";
import { Pagination } from "../../components/Pagination";
import { SortableHeader } from "../../components/SortableHeader";
import { DashboardLayout } from "../../layouts/DashboardLayout";
import { useTableSort } from "../../hooks/useTableSort";
import { rupiah } from "../../utils/format";
import { useAllowedAction } from "../../auth/permissions";
import { getErrorMessage, isForbiddenError } from "../../utils/apiErrors";

function InvoicesPage() {
  const navigate = useNavigate();
  const canCreate = useAllowedAction("invoices:create");
  const canSubmit = useAllowedAction("invoices:submit");
  const canCancel = useAllowedAction("invoices:cancel");
  const canView = useAllowedAction("invoices:view");
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    search: "",
    status: "",
    customerId: "",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  });
  const [customerOptions, setCustomerOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [submittingId, setSubmittingId] = useState("");
  const [cancellingId, setCancellingId] = useState("");
  const { sort, sortedRows, toggleSort } = useTableSort(rows, (row) => ({
    invoiceNumber: row.invoiceNumber,
    customer: row.customer?.name,
    status: row.status,
    total: row.grandTotal,
  }));

  const load = useCallback(() => {
    setLoading(true);
    setApiError("");
    return getInvoices(
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
      .catch((error) => {
        setRows([]);
        if (isForbiddenError(error)) navigate("/forbidden", { replace: true });
        else setApiError(getErrorMessage(error, "Unable to load invoices."));
      })
      .finally(() => setLoading(false));
  }, [filters, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    getCustomers({ limit: 100 })
      .then(({ data }) => setCustomerOptions(data.data.items || []))
      .catch(() => setCustomerOptions([]));
  }, []);

  const filter = (patch) =>
    setFilters((current) => ({ ...current, page: 1, ...patch }));

  async function submit(id) {
    setSubmittingId(id);
    setApiError("");
    try {
      await submitInvoice(id);
      await load();
    } catch (error) {
      if (isForbiddenError(error)) navigate("/forbidden", { replace: true });
      else setApiError(getErrorMessage(error, "Unable to submit invoice."));
    } finally {
      setSubmittingId("");
    }
  }

  async function cancel(id) {
    if (!window.confirm("Cancel invoice?")) return;
    setCancellingId(id);
    setApiError("");
    try {
      await cancelInvoice(id);
      await load();
    } catch (error) {
      if (isForbiddenError(error)) navigate("/forbidden", { replace: true });
      else setApiError(getErrorMessage(error, "Unable to cancel invoice."));
    } finally {
      setCancellingId("");
    }
  }

  return (
    <DashboardLayout>
      <div className="page-head">
        <div>
          <h1>Invoices</h1>
        </div>
        {canCreate && (
          <Link className="primary icon-button" to="/invoices/new">
            <Plus size={18} /> Create Invoice
          </Link>
        )}
      </div>
      <Alert msg={apiError} />
      <FilterToolbar
        search={filters.search}
        onSearch={(search) => filter({ search })}
        placeholder="Search invoice number or customer"
        activeCount={
          ["status", "customerId"].filter((key) => filters[key] !== "").length
        }
        onApply={filter}
        onClear={() => filter({ search: "", status: "", customerId: "" })}
      >
        <label className="field">
          <span>Status</span>
          <select
            name="status"
            value={filters.status}
            onChange={(event) => filter({ status: event.target.value })}
          >
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="PAID">Paid</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </label>
        <label className="field">
          <span>Customer</span>
          <select
            name="customerId"
            value={filters.customerId}
            onChange={(event) => filter({ customerId: event.target.value })}
          >
            <option value="">All customers</option>
            {customerOptions.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.customerCode} - {customer.customerName}
              </option>
            ))}
          </select>
        </label>
      </FilterToolbar>
      {loading ? (
        <p className="muted">Loading invoices...</p>
      ) : (
        <div className="table-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <SortableHeader
                    label="No"
                    sortKey="invoiceNumber"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  <SortableHeader
                    label="Customer"
                    sortKey="customer"
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
                    label="Total"
                    sortKey="total"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  {(canCancel || canSubmit) && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {sortedRows.length ? (
                  sortedRows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <DetailLink
                          allowed={canView}
                          to={`/invoices/${row.id}`}
                        >
                          {row.invoiceNumber}
                        </DetailLink>
                      </td>
                      <td>{row.customer?.name || "-"}</td>
                      <td>
                        <span
                          className={`badge badge-${row.status.toLowerCase()}`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td>{rupiah(row.grandTotal)}</td>
                      {(canCancel || canSubmit) && (
                        <td>
                          {row.status === "DRAFT" && (
                            <InvoiceActions
                              row={row}
                              canCancel={canCancel}
                              canSubmit={canSubmit}
                              submittingId={submittingId}
                              cancellingId={cancellingId}
                              onCancel={cancel}
                              onSubmit={submit}
                            />
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      className="empty-table-cell"
                      colSpan={canCancel || canSubmit ? 5 : 4}
                    >
                      No invoices available.
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

export { InvoicesPage };
export default InvoicesPage;

function InvoiceActions({
  row,
  canCancel,
  canSubmit,
  submittingId,
  cancellingId,
  onCancel,
  onSubmit,
}) {
  const controls = [];
  if (canCancel)
    controls.push(
      <ActionIconButton
        key="cancel"
        label="Cancel Invoice"
        className="action-destructive"
        icon={<CircleSlash size={18} aria-hidden="true" />}
        disabled={Boolean(submittingId) || cancellingId === row.id}
        onClick={() => onCancel(row.id)}
      />,
    );
  if (canSubmit)
    controls.push(
      <ActionIconButton
        key="submit"
        label="Submit Invoice"
        icon={<Check size={18} aria-hidden="true" />}
        disabled={Boolean(cancellingId) || submittingId === row.id}
        onClick={() => onSubmit(row.id)}
      />,
    );
  return <div className="table-actions">{controls}</div>;
}
