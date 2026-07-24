import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { deleteProduct, getProducts } from "../../api/productApi";
import { Alert } from "../../components/Alert";
import { DashboardLayout } from "../../layouts/DashboardLayout";
import { rupiah } from "../../utils/format";

export function ProductsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleting, setDeleting] = useState("");

  function load() {
    setLoading(true);
    return getProducts({ limit: 100 })
      .then((res) => setRows(res.data.data.items))
      .catch((error) => setApiError(error.response?.data?.message || error.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function remove(row) {
    if (deleting) return;
    if (!window.confirm(`Delete product ${row.productCode}?`)) return;
    setDeleting(row.id);
    setApiError("");
    setSuccess("");
    try {
      await deleteProduct(row.id);
      setSuccess("Product berhasil dihapus.");
      await load();
    } catch (error) {
      setApiError(
        error.response?.status === 409
          ? "Product tidak dapat dihapus karena sudah digunakan pada invoice."
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
        <Link className="primary" to="/products/new">Create Product</Link>
      </div>

      <Alert msg={apiError} />
      <Alert msg={success} type="success" />

      {loading ? (
        <p className="muted">Loading products...</p>
      ) : rows.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product Code</th>
                <th>Product Name</th>
                <th>Price</th>
                <th>Initial Stock</th>
                <th>Available Stock</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Link className="product-link" to={`/products/${row.id}`}>
                      {row.productCode}
                    </Link>
                  </td>
                  <td>{row.productName}</td>
                  <td>{rupiah(row.price)}</td>
                  <td>{row.initialStock}</td>
                  <td>{row.availableStock}</td>
                  <td>
                    <span className={`badge ${row.isActive ? "badge-active" : "badge-inactive"}`}>
                      {row.isActive ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions button-group">
                      <Link className="btn-view button-link" to={`/products/${row.id}`}>View</Link>
                      <Link className="btn-edit button-link" to={`/products/${row.id}/edit`}>Edit</Link>
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
        <p className="empty">No products available.</p>
      )}
    </DashboardLayout>
  );
}

export default ProductsPage;
