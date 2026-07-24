import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createProduct, getProductById, updateProduct } from "../../api/productApi";
import { Alert } from "../../components/Alert";
import { Field } from "../../components/Field";
import { DashboardLayout } from "../../layouts/DashboardLayout";

const emptyForm = {
  productCode: "",
  productName: "",
  price: "",
  initialStock: "0",
  isActive: true,
};

export function ProductFormPage({ mode = "create" }) {
  const isEdit = mode === "edit";
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [originalProduct, setOriginalProduct] = useState(null);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    let active = true;
    setLoading(true);
    getProductById(id)
      .then((res) => {
        if (!active) return;
        const product = res.data.data;
        setOriginalProduct(product);
        setForm({
          productCode: product.productCode || "",
          productName: product.productName || "",
          price: String(Number(product.price || 0)),
          initialStock: String(product.initialStock ?? 0),
          isActive: Boolean(product.isActive),
        });
      })
      .catch((error) => setApiError(error.response?.data?.message || error.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id, isEdit]);

  const stockPreview = useMemo(() => {
    if (!isEdit || !originalProduct) return null;
    const newInitialStock = Number(form.initialStock || 0);
    const oldInitialStock = Number(originalProduct.initialStock || 0);
    const currentAvailableStock = Number(originalProduct.availableStock || 0);
    const difference = newInitialStock - oldInitialStock;
    return {
      currentAvailableStock,
      difference,
      newAvailableStock: currentAvailableStock + difference,
    };
  }, [form.initialStock, isEdit, originalProduct]);

  function update(patch) {
    setDirty(true);
    setForm({ ...form, ...patch });
  }

  function validate() {
    const next = {};
    const code = form.productCode.trim();
    const name = form.productName.trim();
    const price = Number(form.price);
    const initialStock = Number(form.initialStock);

    if (!code) next.productCode = "Product Code wajib diisi";
    if (!name) next.productName = "Product Name wajib diisi";
    else if (name.length < 3) next.productName = "Product Name minimal 3 karakter";
    else if (name.length > 150) next.productName = "Product Name maksimal 150 karakter";
    if (!form.price || Number.isNaN(price) || price <= 0) next.price = "Price wajib lebih dari 0";
    if (form.initialStock === "" || Number.isNaN(initialStock)) next.initialStock = "Initial Stock wajib diisi.";
    else if (!Number.isInteger(initialStock)) next.initialStock = "Initial Stock harus berupa bilangan bulat.";
    else if (initialStock < 0) next.initialStock = "Initial Stock tidak boleh negatif.";
    else if (stockPreview?.newAvailableStock < 0) next.initialStock = "Initial Stock tidak dapat lebih kecil dari stock yang sudah digunakan.";

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function save(event) {
    event.preventDefault();
    if (submitting) return;
    setApiError("");
    setSuccess("");
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        productCode: form.productCode.trim().toUpperCase(),
        productName: form.productName.trim(),
        price: Number(form.price),
        initialStock: Number(form.initialStock),
        isActive: form.isActive,
      };
      const res = isEdit ? await updateProduct(id, payload) : await createProduct(payload);
      setSuccess(isEdit ? "Product berhasil diperbarui." : "Product berhasil dibuat.");
      setDirty(false);
      setTimeout(() => navigate(`/products/${res.data.data.id}`), 400);
    } catch (error) {
      setApiError(error.response?.data?.message || error.message);
    } finally {
      setSubmitting(false);
    }
  }

  function back() {
    if (dirty && !window.confirm("Form berubah. Yakin ingin keluar?")) return;
    navigate(isEdit ? `/products/${id}` : "/products");
  }

  if (loading) {
    return (
      <DashboardLayout>
        <p className="muted">Loading product...</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="breadcrumb">Products / {isEdit ? "Edit Product" : "Create Product"}</div>
      <div className="page-head">
        <div>
          <h1>{isEdit ? "Edit Product" : "Create Product"}</h1>
        </div>
      </div>

      <Alert msg={apiError} />
      <Alert msg={success} type="success" />

      <form onSubmit={save} className="invoice-layout">
        <section className="surface full product-form-card">
          <h2>Product Information</h2>
          <div className="two-col">
            <Field label="Product Code" required error={errors.productCode}>
              <input value={form.productCode} onChange={(e) => update({ productCode: e.target.value })} placeholder="PROD-003" />
            </Field>
            <Field label="Product Name" required error={errors.productName}>
              <input value={form.productName} onChange={(e) => update({ productName: e.target.value })} placeholder="Jasa Training API" maxLength="150" />
            </Field>
            <Field label="Price" required error={errors.price}>
              <input type="number" min="1" step="1" value={form.price} onChange={(e) => update({ price: e.target.value })} />
              <small className="product-form-help">Masukkan harga dalam Rupiah tanpa pemisah.</small>
            </Field>
            <Field label="Initial Stock" required error={errors.initialStock}>
              <input type="number" min="0" step="1" value={form.initialStock} onChange={(e) => update({ initialStock: e.target.value })} />
              <small className="product-form-help">
                {isEdit
                  ? "Perubahan Initial Stock akan menyesuaikan Available Stock berdasarkan selisih nilai lama dan nilai baru."
                  : "Available Stock akan otomatis sama dengan Initial Stock saat product dibuat."}
              </small>
            </Field>
            {isEdit && stockPreview && (
              <div className="stock-preview">
                <div><span>Current Available Stock</span><strong>{stockPreview.currentAvailableStock}</strong></div>
                <div><span>Stock Difference</span><strong>{stockPreview.difference > 0 ? `+${stockPreview.difference}` : stockPreview.difference}</strong></div>
                <div><span>New Available Stock</span><strong>{stockPreview.newAvailableStock}</strong></div>
              </div>
            )}
            <Field label="Status" required>
              <label className="form-switch" htmlFor="product-status">
                <input id="product-status" type="checkbox" checked={form.isActive} onChange={(e) => update({ isActive: e.target.checked })} />
                <span>{form.isActive ? "Active" : "Inactive"}</span>
              </label>
              <small className="product-form-help">Product inactive tidak akan muncul pada Create Invoice.</small>
            </Field>
          </div>
        </section>
        <div className="actions button-group">
          <button type="button" className="neutral" onClick={back}>Back</button>
          <button type="submit" className="primary" disabled={submitting}>{submitting ? (isEdit ? "Saving..." : "Creating...") : (isEdit ? "Save Product" : "Create Product")}</button>
        </div>
      </form>
    </DashboardLayout>
  );
}
