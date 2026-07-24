import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { deleteProduct, getProductById } from "../../api/productApi";
import { Alert } from "../../components/Alert";
import { DashboardLayout } from "../../layouts/DashboardLayout";
import { formatDate, rupiah } from "../../utils/format";

export function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getProductById(id)
      .then((res) => active && setProduct(res.data.data))
      .catch((error) => {
        if (!active) return;
        setApiError(error.response?.data?.message || "Gagal memuat product.");
        setProduct(null);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  async function remove() {
    if (deleting || !window.confirm(`Delete product ${product.productCode}?`)) return;
    setDeleting(true);
    setApiError("");
    setSuccess("");
    try {
      await deleteProduct(id);
      setSuccess("Product berhasil dihapus.");
      setTimeout(() => navigate("/products"), 400);
    } catch (error) {
      setApiError(
        error.response?.status === 409
          ? "Product tidak dapat dihapus karena sudah digunakan pada invoice."
          : error.response?.data?.message || error.message,
      );
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <p className="muted">Loading product...</p>
      </DashboardLayout>
    );
  }

  if (!product) {
    return (
      <DashboardLayout>
        <Alert msg={apiError || "Product tidak ditemukan."} />
        <button type="button" className="neutral" onClick={() => navigate("/products")}>Back to Products</button>
      </DashboardLayout>
    );
  }

  const usedStock = Number(product.initialStock || 0) - Number(product.availableStock || 0);

  return (
    <DashboardLayout>
      <div className="breadcrumb">Products / Product Detail</div>
      <div className="page-head">
        <div>
          <h1>Product Detail</h1>
        </div>
      </div>

      <Alert msg={apiError} />
      <Alert msg={success} type="success" />

      <section className="surface full product-detail-card">
        <header className="product-detail-header">
          <h2>Product</h2>
          <div className="invoice-detail-meta">
            <span className="invoice-number">{product.productCode}</span>
            <span className={`badge ${product.isActive ? "badge-active" : "badge-inactive"}`}>
              {product.isActive ? "ACTIVE" : "INACTIVE"}
            </span>
          </div>
        </header>

        <div className="product-detail-grid">
          <ProductInfo label="Product Code" value={product.productCode} />
          <ProductInfo label="Product Name" value={product.productName} />
          <ProductInfo label="Price" value={rupiah(product.price)} />
          <ProductInfo label="Initial Stock" value={product.initialStock} />
          <ProductInfo label="Available Stock" value={product.availableStock} />
          <ProductInfo label="Used Stock" value={usedStock} />
          <ProductInfo label="Status" value={product.isActive ? "ACTIVE" : "INACTIVE"} />
          <ProductInfo label="Created At" value={formatDate(product.createdAt)} />
          <ProductInfo label="Updated At" value={formatDate(product.updatedAt)} />
        </div>
      </section>

      <div className="actions invoice-detail-actions button-group">
        <button type="button" className="neutral" onClick={() => navigate("/products")}>Back</button>
        <Link className="btn-edit" to={`/products/${id}/edit`}>Edit</Link>
        <button type="button" className="danger" onClick={remove} disabled={deleting}>{deleting ? "Deleting..." : "Delete"}</button>
      </div>
    </DashboardLayout>
  );
}

function ProductInfo({ label, value }) {
  return (
    <div>
      <span className="product-detail-label">{label}</span>
      <div className="product-detail-value">{value ?? "-"}</div>
    </div>
  );
}
