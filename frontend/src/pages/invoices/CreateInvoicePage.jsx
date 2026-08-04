import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getInvoiceCustomerOptions } from "../../api/customerApi";
import { createInvoice } from "../../api/invoiceApi";
import { getInvoiceProductOptions } from "../../api/productApi";
import { Alert } from "../../components/Alert";
import { Field } from "../../components/Field";
import { DashboardLayout } from "../../layouts/DashboardLayout";
import { rupiah, today } from "../../utils/format";

const emptyItem = () => ({ productId: "", quantity: 1, discountPercent: 0 });

function CreateInvoicePage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productLoading, setProductLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [dirty, setDirty] = useState(false);
  const [form, setForm] = useState({
    customerId: "",
    issueDate: today(),
    dueDate: today(),
    additionalInfo: "",
    items: [emptyItem()],
  });

  useEffect(() => {
    let active = true;
    setLoading(true);
    setProductLoading(true);
    Promise.all([getInvoiceCustomerOptions(), getInvoiceProductOptions()])
      .then(([customerRes, productRes]) => {
        if (!active) return;
        setCustomers(customerRes.data.data.items);
        setProducts(productRes.data.data.items);
      })
      .catch((error) =>
        setApiError(error.response?.data?.message || error.message),
      )
      .finally(() => {
        if (active) {
          setLoading(false);
          setProductLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedCustomer = customers.find(
    (customer) => customer.id === form.customerId,
  );
  const productMap = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );
  const preview = useMemo(
    () => calculatePreview(form.items, productMap),
    [form.items, productMap],
  );

  const update = (patch) => {
    setDirty(true);
    setForm({ ...form, ...patch });
  };

  const setItem = (index, key, value) => {
    setDirty(true);
    setForm({
      ...form,
      items: form.items.map((item, idx) =>
        idx === index ? { ...item, [key]: value } : item,
      ),
    });
  };

  const addItem = () => update({ items: [...form.items, emptyItem()] });
  const removeItem = (index) => {
    if (form.items.length === 1) return;
    update({ items: form.items.filter((_, idx) => idx !== index) });
  };

  function validate() {
    const next = {};
    if (!form.customerId) next.customerId = "Customer wajib dipilih";
    if (!form.issueDate) next.issueDate = "Issue Date wajib diisi";
    if (!form.dueDate) next.dueDate = "Due Date wajib diisi";
    if (form.dueDate && form.issueDate && form.dueDate < form.issueDate)
      next.dueDate = "Due Date tidak boleh sebelum Issue Date";
    if (form.additionalInfo.length > 500)
      next.additionalInfo = "Maksimum 500 karakter";
    if (!form.items.length) next.items = "Minimal satu item";

    const used = new Set();
    form.items.forEach((item, index) => {
      if (!item.productId) next[`product-${index}`] = "Produk wajib dipilih";
      if (used.has(item.productId))
        next[`product-${index}`] = "Produk tidak boleh duplikat";
      used.add(item.productId);
      if (!Number.isInteger(Number(item.quantity)))
        next[`quantity-${index}`] = "Quantity harus integer";
      if (
        Number(item.discountPercent) < 0 ||
        Number(item.discountPercent) > 100
      )
        next[`discount-${index}`] = "Discount 0 sampai 100";
    });

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function save(e) {
    e.preventDefault();
    setApiError("");
    setSuccess("");
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        customerId: form.customerId,
        issueDate: form.issueDate,
        dueDate: form.dueDate,
        additionalInfo: form.additionalInfo,
        items: form.items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          discountPercent: Number(item.discountPercent || 0),
        })),
      };
      const res = await createInvoice(payload);
      setSuccess("Invoice berhasil dibuat.");
      setDirty(false);
      setTimeout(() => navigate(`/invoices/${res.data.data.id}`), 400);
    } catch (error) {
      setApiError(
        error.response?.status === 409
          ? "Invoice gagal dibuat karena terjadi konflik data. Silakan coba kembali."
          : error.response?.data?.message || error.message,
      );
    } finally {
      setSubmitting(false);
    }
  }

  function cancel() {
    if (dirty && !confirm("Form berubah. Yakin ingin keluar?")) return;
    navigate("/invoices");
  }

  return (
    <DashboardLayout>
      <div className="breadcrumb">Invoices / Create Invoice</div>
      <div className="page-head">
        <div>
          <h1>Create Invoice</h1>
        </div>
      </div>
      <Alert msg={apiError} />
      <Alert msg={success} type="success" />
      <form onSubmit={save} className="invoice-layout">
        <section className="surface full">
          <h2>Invoice Information</h2>
          <div className="two-col">
            <Field label="Invoice Number">
              <input
                value="Generated automatically after saving"
                disabled
                className="readonly-field"
              />
            </Field>
            <Field label="Customer" required error={errors.customerId}>
              {loading ? (
                <div className="muted">Loading customers...</div>
              ) : customers.length ? (
                <select
                  value={form.customerId}
                  onChange={(e) => update({ customerId: e.target.value })}
                >
                  <option value="">Select customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.customerCode} — {customer.customerName}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="empty">No active customer available</div>
              )}
            </Field>
            <Field label="Customer Address">
              <textarea
                value={selectedCustomer?.address || ""}
                disabled
                placeholder="Customer address will appear after selecting customer"
                className="readonly-field"
              />
            </Field>
            <Field label="Issue Date" required error={errors.issueDate}>
              <input
                type="date"
                value={form.issueDate}
                onChange={(e) => update({ issueDate: e.target.value })}
              />
            </Field>
            <Field label="Due Date" required error={errors.dueDate}>
              <input
                type="date"
                min={form.issueDate}
                value={form.dueDate}
                onChange={(e) => update({ dueDate: e.target.value })}
              />
            </Field>
            <Field label="Additional Info" error={errors.additionalInfo}>
              <textarea
                maxLength="500"
                value={form.additionalInfo}
                onChange={(e) => update({ additionalInfo: e.target.value })}
                placeholder="Pembayaran maksimal tujuh hari."
              />
              <small>{form.additionalInfo.length}/500</small>
            </Field>
          </div>
        </section>

        <section className="surface full">
          <div className="section-head">
            <h2>Invoice Products</h2>
            <button type="button" className="primary" onClick={addItem}>
              + Add Product
            </button>
          </div>
          {productLoading ? (
            <p className="muted">Loading products...</p>
          ) : !products.length ? (
            <p className="empty">No active product available</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Discount</th>
                    <th>Total</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((item, index) => (
                    <ProductRow
                      key={index}
                      index={index}
                      item={item}
                      products={products}
                      productMap={productMap}
                      items={form.items}
                      errors={errors}
                      setItem={setItem}
                      removeItem={removeItem}
                      canRemove={form.items.length > 1}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {errors.items && <small className="error">{errors.items}</small>}
        </section>

        <OrderSummary preview={preview} />
        <div className="actions button-group">
          <button type="button" className="neutral" onClick={cancel}>
            Cancel
          </button>
          <button type="submit" className="primary" disabled={submitting}>
            {submitting ? "Saving..." : "Save as Draft"}
          </button>
        </div>
      </form>
    </DashboardLayout>
  );
}

function ProductRow({
  index,
  item,
  products,
  productMap,
  items,
  errors,
  setItem,
  removeItem,
  canRemove,
}) {
  const product = productMap.get(item.productId);
  const used = items
    .map((row, idx) => (idx !== index ? row.productId : null))
    .filter(Boolean);
  const gross = Number(item.quantity || 0) * Number(product?.price || 0);
  const discount = (gross * Number(item.discountPercent || 0)) / 100;

  return (
    <tr>
      <td>{index + 1}</td>
      <td>
        <select
          value={item.productId}
          onChange={(e) => setItem(index, "productId", e.target.value)}
        >
          <option value="">Select product</option>
          {products
            .filter(
              (row) => !used.includes(row.id) || row.id === item.productId,
            )
            .map((row) => (
              <option key={row.id} value={row.id}>
                {row.productCode} — {row.productName}
              </option>
            ))}
        </select>
        <small>Available Stock: {product?.availableStock ?? "-"}</small>
        {errors[`product-${index}`] && (
          <small className="error">{errors[`product-${index}`]}</small>
        )}
      </td>
      <td>
        <input
          type="number"
          step="1"
          value={item.quantity}
          onChange={(e) => setItem(index, "quantity", e.target.value)}
        />
        {errors[`quantity-${index}`] && (
          <small className="error">{errors[`quantity-${index}`]}</small>
        )}
      </td>
      <td>{rupiah(product?.price || 0)}</td>
      <td>
        <div className="input-suffix">
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={item.discountPercent}
            onChange={(e) => setItem(index, "discountPercent", e.target.value)}
          />
          <span className="input-suffix-text">%</span>
        </div>
        {errors[`discount-${index}`] && (
          <small className="error">{errors[`discount-${index}`]}</small>
        )}
      </td>
      <td>{rupiah(gross - discount)}</td>
      <td>
        <button
          type="button"
          className="danger"
          aria-label="Remove product"
          onClick={() => removeItem(index)}
          disabled={!canRemove}
        >
          Remove
        </button>
      </td>
    </tr>
  );
}

function OrderSummary({ preview }) {
  return (
    <section className="summary surface">
      <h2>Order Summary</h2>
      <p>
        <span>Subtotal</span>
        <b>{rupiah(preview.subtotal)}</b>
      </p>
      <p>
        <span>Total Discount</span>
        <b>{rupiah(preview.totalDiscount)}</b>
      </p>
      <p>
        <span>Tax 11%</span>
        <b>{rupiah(preview.tax)}</b>
      </p>
      <p className="grand">
        <span>Grand Total</span>
        <b>{rupiah(preview.grandTotal)}</b>
      </p>
    </section>
  );
}

function calculatePreview(items, productMap) {
  const rows = items.map((item) => {
    const product = productMap.get(item.productId);
    const gross = Number(item.quantity || 0) * Number(product?.price || 0);
    const discount = (gross * Number(item.discountPercent || 0)) / 100;
    return { gross, discount };
  });
  const subtotal = rows.reduce((sum, row) => sum + row.gross, 0);
  const totalDiscount = rows.reduce((sum, row) => sum + row.discount, 0);
  const tax = (subtotal - totalDiscount) * 0.11;
  return {
    subtotal,
    totalDiscount,
    tax,
    grandTotal: subtotal - totalDiscount + tax,
  };
}

export { CreateInvoicePage };
export default CreateInvoicePage;
