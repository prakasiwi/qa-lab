import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { deleteCustomer, getCustomers } from "../../api/customerApi";
import { Alert } from "../../components/Alert";
import { DashboardLayout } from "../../layouts/DashboardLayout";

export function CustomersPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleting, setDeleting] = useState("");

  function load() {
    setLoading(true);
    return getCustomers({ limit: 100 })
      .then((res) => setRows(res.data.data.items))
      .catch((error) => setApiError(error.response?.data?.message || error.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function remove(row) {
    if (deleting) return;
    if (!window.confirm(`Delete customer ${row.customerCode}?`)) return;
    setDeleting(row.id);
    setApiError("");
    setSuccess("");
    try {
      await deleteCustomer(row.id);
      setSuccess("Customer berhasil dihapus.");
      await load();
    } catch (error) {
      setApiError(
        error.response?.status === 409
          ? "Customer tidak dapat dihapus karena sudah digunakan pada invoice. Ubah status menjadi Inactive."
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
        <Link className="primary" to="/customers/new">Create Customer</Link>
      </div>

      <Alert msg={apiError} />
      <Alert msg={success} type="success" />

      {loading ? (
        <p className="muted">Loading customers...</p>
      ) : rows.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Customer Code</th>
                <th>Customer Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td><Link className="customer-link" to={`/customers/${row.id}`}>{row.customerCode}</Link></td>
                  <td>{row.customerName}</td>
                  <td>{row.email}</td>
                  <td>{row.phone || "-"}</td>
                  <td>
                    <span className={`badge ${row.isActive ? "badge-active" : "badge-inactive"}`}>
                      {row.isActive ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions button-group">
                      <Link className="btn-view button-link" to={`/customers/${row.id}`}>View</Link>
                      <Link className="btn-edit button-link" to={`/customers/${row.id}/edit`}>Edit</Link>
                      <button type="button" className="danger" onClick={() => remove(row)} disabled={deleting === row.id}>
                        {deleting === row.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="empty">No customers available.</p>
      )}
    </DashboardLayout>
  );
}

export default CustomersPage;
