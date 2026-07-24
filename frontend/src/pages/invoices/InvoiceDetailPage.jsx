import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  cancelInvoice,
  getInvoiceById,
  payInvoice,
  submitInvoice,
} from "../../api/invoiceApi";
import { Alert } from "../../components/Alert";
import { companyProfile } from "../../config/companyProfile";
import { DashboardLayout } from "../../layouts/DashboardLayout";
import { formatDate, rupiah } from "../../utils/format";

const conflictMessage =
  "Invoice sudah diproses oleh request lain. Silakan muat ulang halaman.";

export function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [success, setSuccess] = useState("");
  const [runningAction, setRunningAction] = useState("");

  const submitting = runningAction === "submit";
  const status = invoice?.status || "";
  const badgeClass = `badge badge-${status.toLowerCase()}`;

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setApiError("");

      try {
        const response = await getInvoiceById(id);
        if (active) setInvoice(response.data.data);
      } catch (error) {
        if (!active) return;
        setApiError(error.response?.data?.message || "Gagal memuat invoice.");
        setInvoice(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [id]);

  async function loadInvoice() {
    const response = await getInvoiceById(id);
    setInvoice(response.data.data);
  }

  async function runInvoiceAction(action, request, confirmMessage, successMessage) {
    if (runningAction) return;
    if (confirmMessage && !window.confirm(confirmMessage)) return;

    setRunningAction(action);
    setApiError("");
    setSuccess("");

    try {
      await request(id);
      setSuccess(successMessage);
      await loadInvoice();
    } catch (error) {
      setApiError(
        error.response?.status === 409
          ? conflictMessage
          : error.response?.data?.message || error.message,
      );
    } finally {
      setRunningAction("");
    }
  }

  function handleSubmit() {
    runInvoiceAction(
      "submit",
      submitInvoice,
      "Submit Invoice?\nInvoice yang sudah disubmit tidak dapat diedit kembali.",
      "Invoice berhasil disubmit.",
    );
  }

  function handlePay() {
    runInvoiceAction(
      "pay",
      payInvoice,
      "Mark invoice as paid?",
      "Invoice berhasil ditandai paid.",
    );
  }

  function handleCancel() {
    runInvoiceAction(
      "cancel",
      cancelInvoice,
      "Cancel invoice?",
      "Invoice berhasil dibatalkan.",
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <p className="muted">Loading invoice...</p>
      </DashboardLayout>
    );
  }

  if (!invoice) {
    return (
      <DashboardLayout>
        <div className="breadcrumb">Invoices / Invoice Detail</div>
        <div className="page-head">
          <div>
            <h1>Invoice Detail</h1>
          </div>
        </div>
        <Alert msg={apiError || "Invoice tidak ditemukan."} />
        <button
          type="button"
          className="neutral"
          onClick={() => navigate("/invoices")}
        >
          Back to Invoices
        </button>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="breadcrumb">Invoices / Invoice Detail</div>

      <div className="page-head">
        <div>
          <h1>Invoice Detail</h1>
        </div>
      </div>

      <Alert msg={apiError} />
      <Alert msg={success} type="success" />

      <section className="surface full invoice-detail-card">
        <header className="invoice-detail-header">
          <h2>Invoice</h2>

          <div className="invoice-detail-meta">
            <span className="invoice-number">{invoice.invoiceNumber}</span>
            <span className={badgeClass}>{status}</span>
          </div>
        </header>

        <div className="invoice-party-grid">
          <section className="invoice-party">
            <span className="invoice-label">From</span>
            <strong>{companyProfile.name}</strong>
            <p>{companyProfile.address}</p>

            <div className="invoice-date-block">
              <span className="invoice-label">Issued On</span>
              <strong>{formatDate(invoice.issueDate)}</strong>
            </div>
          </section>

          <section className="invoice-party invoice-party-customer">
            <span className="invoice-label">To</span>
            <strong>{invoice.customerNameSnapshot}{invoice.customerCodeSnapshot ? ` (${invoice.customerCodeSnapshot})` : ""}</strong>
            <p>{invoice.customerAddressSnapshot || "-"}</p>

            <div className="invoice-date-block">
              <span className="invoice-label">Due On</span>
              <strong>{formatDate(invoice.dueDate)}</strong>
            </div>
          </section>
        </div>

        <div className="table-wrap">
          <table className="invoice-detail-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Product</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Discount</th>
                <th>Total</th>
              </tr>
            </thead>

            <tbody>
              {invoice.items?.length ? (
                invoice.items.map((item, index) => (
                  <tr key={item.id || index}>
                    <td>{index + 1}</td>
                    <td>{item.productCodeSnapshot ? `${item.productNameSnapshot} (${item.productCodeSnapshot})` : item.productNameSnapshot}</td>
                    <td>{item.quantity}</td>
                    <td>{rupiah(item.unitPrice)}</td>
                    <td>{Number(item.discountPercent || 0)}%</td>
                    <td>{rupiah(item.lineTotal)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="empty">
                    No invoice products available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="invoice-bottom-grid">
          <section className="invoice-notes">
            <h3>Additional Info</h3>
            <p>{invoice.additionalInfo || "-"}</p>
          </section>

          <section className="invoice-summary">
            <h3>Order Summary</h3>

            <div className="invoice-summary-row">
              <span>Subtotal</span>
              <strong>{rupiah(invoice.subtotal)}</strong>
            </div>

            <div className="invoice-summary-row">
              <span>Total Discount</span>
              <strong>{rupiah(invoice.totalDiscount)}</strong>
            </div>

            <div className="invoice-summary-row">
              <span>Tax {Number(invoice.taxRate ?? 11)}%</span>
              <strong>{rupiah(invoice.tax)}</strong>
            </div>

            <div className="invoice-summary-row grand">
              <span>Grand Total</span>
              <strong>{rupiah(invoice.grandTotal)}</strong>
            </div>
          </section>
        </div>
      </section>

      <div className="actions invoice-detail-actions button-group">
        <button
          type="button"
          className="neutral"
          onClick={() => navigate("/invoices")}
        >
          Back
        </button>

        {status === "DRAFT" && (
          <>
            <button
              type="button"
              className="danger"
              onClick={handleCancel}
              disabled={Boolean(runningAction)}
            >
              {runningAction === "cancel" ? "Cancelling..." : "Cancel Invoice"}
            </button>
            <button type="button" className="primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Invoice"}
            </button>
          </>
        )}

        {status === "SUBMITTED" && (
          <button
            type="button"
            className="approved"
            onClick={handlePay}
            disabled={Boolean(runningAction)}
          >
            {runningAction === "pay" ? "Saving..." : "Mark as Paid"}
          </button>
        )}
      </div>
    </DashboardLayout>
  );
}
