import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { deleteCustomer, getCustomerById } from "../../api/customerApi";
import { Alert } from "../../components/Alert";
import { DashboardLayout } from "../../layouts/DashboardLayout";
import { formatDate } from "../../utils/format";

export function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getCustomerById(id)
      .then((res) => active && setCustomer(res.data.data))
      .catch((error) => {
        if (!active) return;
        setApiError(error.response?.data?.message || "Gagal memuat customer.");
        setCustomer(null);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  async function remove() {
    if (deleting || !window.confirm(`Delete customer ${customer.customerCode}?`)) return;
    setDeleting(true);
    setApiError("");
    setSuccess("");
    try {
      await deleteCustomer(id);
      setSuccess("Customer berhasil dihapus.");
      setTimeout(() => navigate("/customers"), 400);
    } catch (error) {
      setApiError(
        error.response?.status === 409
          ? "Customer tidak dapat dihapus karena sudah digunakan pada invoice. Ubah status menjadi Inactive."
          : error.response?.data?.message || error.message,
      );
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <p className="muted">Loading customer...</p>
      </DashboardLayout>
    );
  }

  if (!customer) {
    return (
      <DashboardLayout>
        <Alert msg={apiError || "Customer tidak ditemukan."} />
        <button type="button" className="neutral" onClick={() => navigate("/customers")}>Back to Customers</button>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="breadcrumb">Customers / Customer Detail</div>
      <div className="page-head">
        <div>
          <h1>Customer Detail</h1>
        </div>
      </div>

      <Alert msg={apiError} />
      <Alert msg={success} type="success" />

      <section className="surface full customer-detail-card">
        <header className="customer-detail-header">
          <h2>Customer</h2>
          <div className="customer-detail-meta">
            <span className="invoice-number">{customer.customerCode}</span>
            <span className={`badge ${customer.isActive ? "badge-active" : "badge-inactive"}`}>
              {customer.isActive ? "ACTIVE" : "INACTIVE"}
            </span>
          </div>
        </header>

        <div className="customer-detail-grid">
          <CustomerInfo label="Customer Code" value={customer.customerCode} />
          <CustomerInfo label="Customer Name" value={customer.customerName} />
          <CustomerInfo label="Email" value={customer.email} />
          <CustomerInfo label="Phone" value={customer.phone || "-"} />
          <CustomerInfo label="Status" value={customer.isActive ? "ACTIVE" : "INACTIVE"} />
          <CustomerInfo label="Created At" value={formatDate(customer.createdAt)} />
          <CustomerInfo label="Updated At" value={formatDate(customer.updatedAt)} />
          <CustomerInfo label="Address" value={customer.address} full address />
        </div>
      </section>

      <div className="actions invoice-detail-actions button-group">
        <button type="button" className="neutral" onClick={() => navigate("/customers")}>Back</button>
        <Link className="btn-edit" to={`/customers/${id}/edit`}>Edit</Link>
        <button type="button" className="danger" onClick={remove} disabled={deleting}>{deleting ? "Deleting..." : "Delete"}</button>
      </div>
    </DashboardLayout>
  );
}

function CustomerInfo({ label, value, full = false, address = false }) {
  return (
    <div className={full ? "customer-detail-item full" : "customer-detail-item"}>
      <span className="customer-detail-label">{label}</span>
      <div className={`customer-detail-value ${address ? "customer-address-value" : ""}`}>{value ?? "-"}</div>
    </div>
  );
}
