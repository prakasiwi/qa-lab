import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createPermission,
  getPermission,
  getPermissionActionCatalog,
  updatePermission,
} from "../../api/permissionApi";
import { Alert } from "../../components/Alert";
import { Field } from "../../components/Field";
import { PermissionMatrix } from "../../components/permissions/PermissionMatrix";
import { DashboardLayout } from "../../layouts/DashboardLayout";
import { getErrorMessage, isForbiddenError } from "../../utils/apiErrors";

const initialForm = {
  code: "",
  name: "",
  description: "",
  isActive: true,
  updatedAt: "",
};
const toSelectedActions = (actions = []) =>
  new Set(actions.map(({ resource, action }) => `${resource}:${action}`));

export function PermissionFormPage({ mode = "create" }) {
  const isEdit = mode === "edit";
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [catalog, setCatalog] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [impact, setImpact] = useState(null);
  const originalActive = useRef(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getPermissionActionCatalog(),
      ...(isEdit ? [getPermission(id)] : []),
    ])
      .then(([catalogResponse, detailResponse]) => {
        setCatalog(catalogResponse.data.data.items || []);
        if (!detailResponse) return;
        const permission = detailResponse.data.data;
        originalActive.current = permission.isActive;
        setImpact(permission.impact);
        setForm({
          code: permission.code,
          name: permission.name,
          description: permission.description || "",
          isActive: permission.isActive,
          updatedAt: permission.updatedAt,
        });
        setSelected(toSelectedActions(permission.actions));
      })
      .catch((requestError) => {
        if (isForbiddenError(requestError))
          navigate("/forbidden", { replace: true });
        else
          setError(getErrorMessage(requestError, "Unable to load permission."));
      })
      .finally(() => setLoading(false));
  }, [id, isEdit, navigate]);

  async function save(event) {
    event.preventDefault();
    const hasView = [...selected].some((key) => key.endsWith(":view"));
    if (form.isActive && !hasView) {
      setError("An active permission must contain at least one View action.");
      return;
    }
    if (isEdit && originalActive.current && !form.isActive) {
      const affected = impact
        ? `${impact.activeUsers} active user(s) and ${impact.activeSessions} active session(s)`
        : "active assignments and sessions";
      if (
        !window.confirm(`Deactivate this permission? This affects ${affected}.`)
      )
        return;
    }
    setBusy(true);
    setError("");
    try {
      const actions = [...selected].sort().map((key) => {
        const separator = key.indexOf(":");
        return {
          resource: key.slice(0, separator),
          action: key.slice(separator + 1),
        };
      });
      const payload = {
        name: form.name,
        description: form.description,
        isActive: form.isActive,
        actions,
        ...(isEdit ? { updatedAt: form.updatedAt } : { code: form.code }),
      };
      const response = isEdit
        ? await updatePermission(id, payload)
        : await createPermission(payload);
      navigate(`/permissions/${isEdit ? id : response.data.data.id}`, {
        replace: true,
      });
    } catch (requestError) {
      if (isForbiddenError(requestError))
        navigate("/forbidden", { replace: true });
      else
        setError(getErrorMessage(requestError, "Unable to save permission."));
    } finally {
      setBusy(false);
    }
  }

  if (loading)
    return (
      <DashboardLayout>
        <p role="status" className="muted">
          Loading permission…
        </p>
      </DashboardLayout>
    );

  return (
    <DashboardLayout>
      <div className="breadcrumb">
        IAM / Permission / {isEdit ? "Edit Permission" : "Create Permission"}
      </div>
      <div className="page-head">
        <div>
          <h1>{isEdit ? "Edit Permission" : "Create Permission"}</h1>
        </div>
      </div>
      <Alert msg={error} />
      <form className="iam-form" onSubmit={save}>
        <section className="surface full">
          <h2>Permission Information</h2>
          <div className="iam-information-grid">
            <Field label="Permission Code" required>
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
                placeholder="e.g. FINANCE_MANAGER"
              />
            </Field>
            <Field label="Permission Name" required>
              <input
                value={form.name}
                required
                minLength="2"
                maxLength="100"
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                placeholder="Enter permission name"
              />
            </Field>
            <Field label="Description">
              <textarea
                value={form.description}
                maxLength="500"
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                placeholder="Describe this permission"
              />
            </Field>
            <Field label="Status">
              <div className="status-toggle">
                <label className="switch-control">
                  <input
                    id="permission-status"
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
        <section className="surface full">
          <div className="section-head">
            <div>
              <h2>Access Matrix</h2>
              <p className="muted">
                Selecting a mutation also grants View for that resource.
              </p>
            </div>
          </div>
          <PermissionMatrix
            catalog={catalog}
            selected={selected}
            onChange={setSelected}
          />
        </section>
        <div className="actions form-actions">
          <button
            type="button"
            className="neutral"
            onClick={() =>
              navigate(isEdit ? `/permissions/${id}` : "/permissions")
            }
          >
            Back
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "Saving…" : isEdit ? "Save Changes" : "Create Permission"}
          </button>
        </div>
      </form>
    </DashboardLayout>
  );
}
