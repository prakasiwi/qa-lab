import { ArrowLeft, Info, Plus, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createUser,
  getAccessOptions,
  getUser,
  updateUser,
} from "../../api/userApi";
import { Alert } from "../../components/Alert";
import { Field } from "../../components/Field";
import { AccessFields } from "../../components/users/AccessFields";
import { DashboardLayout } from "../../layouts/DashboardLayout";
const emptyAssignment = () => ({
  key: crypto.randomUUID(),
  roleId: "",
  permissionId: "",
});
export function UserFormPage({ mode = "create" }) {
  const isEdit = mode === "edit";
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    mfaEnabled: false,
    updatedAt: "",
    accessAssignments: [emptyAssignment()],
  });
  const originalMfa = useRef(false);
  const [options, setOptions] = useState({ roles: [], permissions: [] });
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    Promise.all([getAccessOptions(), ...(isEdit ? [getUser(id)] : [])])
      .then(([choice, detail]) => {
        setOptions(choice.data.data);
        if (!detail) return;
        const user = detail.data.data;
        originalMfa.current = Boolean(user.mfaEnabled);
        setStatus(user.status);
        setForm({
          name: user.name,
          phone: user.phone || "",
          email: user.email,
          mfaEnabled: Boolean(user.mfaEnabled),
          updatedAt: user.updatedAt,
          accessAssignments: user.accesses
            .filter((item) => item.isActive)
            .map((item) => ({
              key: item.id,
              roleId: item.roleId,
              permissionId: item.permissionId,
            })),
        });
      })
      .catch((requestError) =>
        setError(requestError.response?.data?.message || requestError.message),
      );
  }, [id, isEdit]);
  async function save(event) {
    event.preventDefault();
    if (!form.accessAssignments.length)
      return setError("At least one access assignment is required.");
    if (
      isEdit &&
      form.mfaEnabled !== originalMfa.current &&
      !window.confirm(
        "Changing MFA will sign this user out on all devices. Continue?",
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const payload = {
        ...form,
        accessAssignments: form.accessAssignments.map(
          ({ roleId, permissionId }) => ({ roleId, permissionId }),
        ),
      };
      const response = isEdit
        ? await updateUser(id, payload)
        : await createUser(payload);
      navigate(`/users/${isEdit ? id : response.data.data.id}`, {
        replace: true,
        state: { deliveryStatus: response.data.data.deliveryStatus },
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message);
    } finally {
      setBusy(false);
    }
  }
  const backTo = isEdit ? `/users/${id}` : "/users";
  return (
    <DashboardLayout>
      <div className="breadcrumb">
        IAM / Users / {isEdit ? "Edit User" : "Invite User"}
      </div>
      <button
        type="button"
        className="detail-back-link user-back-link"
        onClick={() => navigate(backTo)}
      >
        <ArrowLeft size={18} /> Back to Users
      </button>
      <div className="page-head user-page-heading">
        <div className="heading-with-badge">
          <h1>{isEdit ? "Edit User" : "Invite User"}</h1>
          {status && (
            <span className={`badge status-${status.toLowerCase()}`}>
              {status.replaceAll("_", " ")}
            </span>
          )}
        </div>
      </div>
      <Alert msg={error} />
      <form className="user-form" onSubmit={save}>
        <section className="surface full user-card">
          <h2>Personal Information</h2>
          <div className="user-personal-grid">
            <Field label="Name" required>
              <input
                value={form.name}
                minLength="2"
                maxLength="100"
                required
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                placeholder="Enter full name"
              />
            </Field>
            <Field label="Phone (optional)">
              <input
                value={form.phone}
                maxLength="30"
                onChange={(event) =>
                  setForm({ ...form, phone: event.target.value })
                }
                placeholder="Enter phone number"
              />
            </Field>
            <Field label="Email" required className="user-email-field">
              <input
                type="email"
                value={form.email}
                required
                disabled={isEdit}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
                placeholder="Enter email address"
              />
            </Field>
          </div>
        </section>
        <section className="surface full user-card">
          <h2>Security</h2>
          <div className="mfa-control">
            <div className="mfa-copy">
              <ShieldCheck size={28} />
              <div>
                <strong>Require MFA</strong>
                <p>Require an email OTP at every sign-in.</p>
              </div>
            </div>
            <label className="switch-control">
              <input
                type="checkbox"
                checked={form.mfaEnabled}
                onChange={(event) =>
                  setForm({ ...form, mfaEnabled: event.target.checked })
                }
              />
              <span />
            </label>
            <strong className="switch-state">
              {form.mfaEnabled ? "ON" : "OFF"}
            </strong>
          </div>
          {isEdit && form.mfaEnabled !== originalMfa.current && (
            <div className="mfa-warning">
              <Info size={19} /> Changing MFA signs this user out on all devices
              after saving.
            </div>
          )}
        </section>
        <section className="surface full user-card">
          <div className="section-head">
            <h2>Access Assignments</h2>
            <button
              type="button"
              className="primary icon-button"
              onClick={() =>
                setForm({
                  ...form,
                  accessAssignments: [
                    ...form.accessAssignments,
                    emptyAssignment(),
                  ],
                })
              }
            >
              <Plus size={17} /> Add Access
            </button>
          </div>
          <AccessFields
            assignments={form.accessAssignments}
            options={options}
            onChange={(accessAssignments) =>
              setForm({ ...form, accessAssignments })
            }
          />
        </section>
        <div className="actions form-actions">
          <button
            type="button"
            className="neutral"
            onClick={() => navigate(backTo)}
          >
            Back
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "Saving..." : isEdit ? "Save Changes" : "Send Invitation"}
          </button>
        </div>
      </form>
    </DashboardLayout>
  );
}
