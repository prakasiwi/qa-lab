import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createRole, getRole, updateRole } from "../../api/roleApi";
import { Alert } from "../../components/Alert";
import { Field } from "../../components/Field";
import { DashboardLayout } from "../../layouts/DashboardLayout";
import { getErrorMessage, isForbiddenError } from "../../utils/apiErrors";

const initialForm = {
  code: "",
  name: "",
  description: "",
  isActive: true,
  updatedAt: "",
};

export function RoleFormPage({ mode = "create" }) {
  const isEdit = mode === "edit";
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [impact, setImpact] = useState(null);
  const originalActive = useRef(true);
  const [loading, setLoading] = useState(isEdit);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    getRole(id)
      .then(({ data }) => {
        const role = data.data;
        originalActive.current = role.isActive;
        setImpact(role.impact);
        setForm({
          code: role.code,
          name: role.name,
          description: role.description || "",
          isActive: role.isActive,
          updatedAt: role.updatedAt,
        });
      })
      .catch((requestError) => {
        if (isForbiddenError(requestError))
          navigate("/forbidden", { replace: true });
        else setError(getErrorMessage(requestError, "Unable to load role."));
      })
      .finally(() => setLoading(false));
  }, [id, isEdit, navigate]);

  async function save(event) {
    event.preventDefault();
    if (isEdit && originalActive.current && !form.isActive) {
      const affected = impact
        ? `${impact.activeUsers} active user(s) and ${impact.activeSessions} active session(s)`
        : "active assignments and sessions";
      if (!window.confirm(`Deactivate this role? This affects ${affected}.`))
        return;
    }
    setBusy(true);
    setError("");
    try {
      const payload = {
        name: form.name,
        description: form.description,
        isActive: form.isActive,
        ...(isEdit ? { updatedAt: form.updatedAt } : { code: form.code }),
      };
      const response = isEdit
        ? await updateRole(id, payload)
        : await createRole(payload);
      navigate(`/roles/${isEdit ? id : response.data.data.id}`, {
        replace: true,
      });
    } catch (requestError) {
      if (isForbiddenError(requestError))
        navigate("/forbidden", { replace: true });
      else setError(getErrorMessage(requestError, "Unable to save role."));
    } finally {
      setBusy(false);
    }
  }

  if (loading)
    return (
      <DashboardLayout>
        <p role="status" className="muted">
          Loading role…
        </p>
      </DashboardLayout>
    );

  return (
    <DashboardLayout>
      <div className="breadcrumb">
        IAM / Role / {isEdit ? "Edit Role" : "Create Role"}
      </div>
      <div className="page-head">
        <div>
          <h1>{isEdit ? "Edit Role" : "Create Role"}</h1>
        </div>
      </div>
      <Alert msg={error} />
      <form className="iam-form" onSubmit={save}>
        <section className="surface full">
          <h2>Role Information</h2>
          <div className="iam-information-grid">
            <Field label="Role Code" required>
              <input
                value={form.code}
                required
                minLength="2"
                maxLength="50"
                pattern="[A-Z][A-Z0-9_]*"
                disabled={isEdit}
                className={isEdit ? "readonly-field" : ""}
                onChange={(event) =>
                  setForm({ ...form, code: event.target.value.toUpperCase() })
                }
                placeholder="e.g. FINANCE_ADMIN"
              />
            </Field>
            <Field label="Role Name" required>
              <input
                value={form.name}
                required
                minLength="2"
                maxLength="100"
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                placeholder="Enter role name"
              />
            </Field>
            <Field label="Description">
              <textarea
                value={form.description}
                maxLength="500"
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                placeholder="Describe this role"
              />
            </Field>
            <Field label="Status">
              <div className="status-toggle">
                <label className="switch-control">
                  <input
                    id="role-status"
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) =>
                      setForm({ ...form, isActive: event.target.checked })
                    }
                  />
                  <span />
                </label>
                <strong>{form.isActive ? "Active" : "Inactive"}</strong>
              </div>
            </Field>
          </div>
        </section>
        <div className="actions form-actions">
          <button
            type="button"
            className="neutral"
            onClick={() => navigate(isEdit ? `/roles/${id}` : "/roles")}
          >
            Back
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "Saving…" : isEdit ? "Save Changes" : "Create Role"}
          </button>
        </div>
      </form>
    </DashboardLayout>
  );
}
