import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createCustomer, getCustomerById, updateCustomer } from "../../api/customerApi";
import { Alert } from "../../components/Alert";
import { Field } from "../../components/Field";
import { DashboardLayout } from "../../layouts/DashboardLayout";

const emptyForm = {
  customerCode: "",
  customerName: "",
  email: "",
  phone: "",
  address: "",
  isActive: true,
};

export function CustomerFormPage({ mode = "create" }) {
  const isEdit = mode === "edit";
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
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
    getCustomerById(id)
      .then((res) => {
        if (!active) return;
        const customer = res.data.data;
        setForm({
          customerCode: customer.customerCode || "",
          customerName: customer.customerName || "",
          email: customer.email || "",
          phone: customer.phone || "",
          address: customer.address || "",
          isActive: Boolean(customer.isActive),
        });
      })
      .catch((error) => setApiError(error.response?.data?.message || error.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id, isEdit]);

  function update(patch) {
    setDirty(true);
    setForm({ ...form, ...patch });
  }

  function validate() {
    const next = {};
    const code = form.customerCode.trim();
    const name = form.customerName.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    const address = form.address.trim();

    if (!code) next.customerCode = "Customer Code wajib diisi";
    if (!name) next.customerName = "Customer Name wajib diisi";
    else if (name.length < 3) next.customerName = "Customer Name minimal 3 karakter";
    else if (name.length > 150) next.customerName = "Customer Name maksimal 150 karakter";
    if (!email) next.email = "Email wajib diisi";
    else if (!/^\S+@\S+\.\S+$/.test(email)) next.email = "Email tidak valid";
    if (phone && !/^[0-9+\-()\s]*$/.test(phone)) next.phone = "Phone hanya boleh berisi angka, +, spasi, -, dan tanda kurung";
    if (!address) next.address = "Address wajib diisi";
    else if (address.length > 500) next.address = "Address maksimal 500 karakter";

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
        customerCode: form.customerCode.trim().toUpperCase(),
        customerName: form.customerName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        isActive: form.isActive,
      };
      const res = isEdit ? await updateCustomer(id, payload) : await createCustomer(payload);
      setSuccess(isEdit ? "Customer berhasil diperbarui." : "Customer berhasil dibuat.");
      setDirty(false);
      setTimeout(() => navigate(`/customers/${res.data.data.id}`), 400);
    } catch (error) {
      setApiError(error.response?.data?.message || error.message);
    } finally {
      setSubmitting(false);
    }
  }

  function back() {
    if (dirty && !window.confirm("Form berubah. Yakin ingin keluar?")) return;
    navigate(isEdit ? `/customers/${id}` : "/customers");
  }

  if (loading) {
    return (
      <DashboardLayout>
        <p className="muted">Loading customer...</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="breadcrumb">Customers / {isEdit ? "Edit Customer" : "Create Customer"}</div>
      <div className="page-head">
        <div>
          <h1>{isEdit ? "Edit Customer" : "Create Customer"}</h1>
        </div>
      </div>

      <Alert msg={apiError} />
      <Alert msg={success} type="success" />

      <form onSubmit={save} className="invoice-layout">
        <section className="surface full customer-form-card">
          <h2>Customer Information</h2>
          <div className="two-col">
            <Field label="Customer Code" required error={errors.customerCode}>
              <input value={form.customerCode} onChange={(e) => update({ customerCode: e.target.value })} placeholder="CUST-003" />
            </Field>
            <Field label="Customer Name" required error={errors.customerName}>
              <input value={form.customerName} onChange={(e) => update({ customerName: e.target.value })} maxLength="150" placeholder="PT Belajar QA" />
            </Field>
            <Field label="Email" required error={errors.email}>
              <input type="email" value={form.email} onChange={(e) => update({ email: e.target.value })} placeholder="finance@example.com" />
            </Field>
            <Field label="Phone" error={errors.phone}>
              <input value={form.phone} onChange={(e) => update({ phone: e.target.value })} placeholder="08123456789" />
            </Field>
            <Field label="Address" required error={errors.address}>
              <textarea maxLength="500" value={form.address} onChange={(e) => update({ address: e.target.value })} placeholder="Jl. Pendidikan No. 1, Jakarta" />
              <small>{form.address.length}/500</small>
            </Field>
            <Field label="Status" required>
              <label className="form-switch" htmlFor="customer-status">
                <input id="customer-status" type="checkbox" checked={form.isActive} onChange={(e) => update({ isActive: e.target.checked })} />
                <span>{form.isActive ? "Active" : "Inactive"}</span>
              </label>
              <small className="product-form-help">Customer inactive tidak akan muncul pada Create Invoice.</small>
            </Field>
          </div>
        </section>
        <div className="actions button-group">
          <button type="button" className="neutral" onClick={back}>Back</button>
          <button type="submit" className="primary" disabled={submitting}>{submitting ? (isEdit ? "Saving..." : "Creating...") : (isEdit ? "Save Customer" : "Create Customer")}</button>
        </div>
      </form>
    </DashboardLayout>
  );
}
