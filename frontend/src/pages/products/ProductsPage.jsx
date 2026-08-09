import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { deleteProduct, getProducts } from "../../api/productApi";
import { Alert } from "../../components/Alert";
import { Pagination } from "../../components/Pagination";
import { DashboardLayout } from "../../layouts/DashboardLayout";
import { rupiah } from "../../utils/format";

export function ProductsPage() {
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleting, setDeleting] = useState("");

  function load(page = pagination.page, limit = pagination.limit) {
    setLoading(true);
    return getProducts({ page, limit })
      .then((res) => {
        const data = res.data.data;
        setRows(data.items);
        setPagination({ page: data.page, limit: data.limit, total: data.total });
      })
      .catch((error) => setApiError(error.response?.data?.message || error.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load(pagination.page, pagination.limit);
  }, [pagination.page, pagination.limit]);

  function changeLimit(limit) {
    setPagination((current) => ({ ...current, page: 1, limit }));
  }

  async function remove(row) {
    if (deleting) return;
    if (!window.confirm(`Delete product ${row.productCode}?`)) return;
    setDeleting(row.id);
    setApiError("");
    setSuccess("");
    try {
      await deleteProduct(row.id);
      setSuccess("Product berhasil dihapus.");
      if (rows.length === 1 && pagination.page > 1) {
        setPagination((current) => ({ ...current, page: current.page - 1 }));
      } else {
        await load();
      }
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
      ) : (
        <div className="table-card">
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
                {rows.length ? rows.map((row) => (
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
                )) : (
                  <tr>
                    <td className="empty-table-cell" colSpan={7}>No products available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            page={pagination.page}
            limit={pagination.limit}
            total={pagination.total}
            onPageChange={(page) => setPagination((current) => ({ ...current, page }))}
            onLimitChange={changeLimit}
          />
        </div>
      )}
    </DashboardLayout>
  );
}

export default ProductsPage;
