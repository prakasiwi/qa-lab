import { ArrowLeft, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getPermission,
  getPermissionActionCatalog,
} from "../../api/permissionApi";
import { useAllowedAction } from "../../auth/permissions";
import { Alert } from "../../components/Alert";
import { ActionIconButton } from "../../components/ActionIconButton";
import { PermissionMatrix } from "../../components/permissions/PermissionMatrix";
import { DashboardLayout } from "../../layouts/DashboardLayout";
import { getErrorMessage, isForbiddenError } from "../../utils/apiErrors";

export function PermissionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const canManage = useAllowedAction("iam_permissions:manage");
  const [permission, setPermission] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getPermission(id), getPermissionActionCatalog()])
      .then(([detailResponse, catalogResponse]) => {
        setPermission(detailResponse.data.data);
        setCatalog(catalogResponse.data.data.items || []);
      })
      .catch((requestError) => {
        if (isForbiddenError(requestError))
          navigate("/forbidden", { replace: true });
        else
          setError(getErrorMessage(requestError, "Unable to load permission."));
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading)
    return (
      <DashboardLayout>
        <p role="status" className="muted">
          Loading permission…
        </p>
      </DashboardLayout>
    );
  if (!permission)
    return (
      <DashboardLayout>
        <Alert msg={error || "Permission was not found."} />
        <Link className="neutral button-link" to="/permissions">
          <ArrowLeft size={18} aria-hidden="true" /> Back
        </Link>
      </DashboardLayout>
    );
  const selected = new Set(
    permission.actions.map(({ resource, action }) => `${resource}:${action}`),
  );

  return (
    <DashboardLayout>
      <div className="breadcrumb">IAM / Permission / Permission Details</div>
      <div className="detail-back">
        <Link className="detail-back-link" to="/permissions">
          <ArrowLeft size={18} aria-hidden="true" /> Back
        </Link>
      </div>
      <div className="page-head detail-page-head">
        <div className="heading-with-badge">
          <h1>Permission Details</h1>
          <span
            className={`badge ${permission.isActive ? "status-active" : "status-inactive"}`}
          >
            {permission.isActive ? "ACTIVE" : "INACTIVE"}
          </span>
        </div>
        <div className="detail-header-actions">
          {canManage && (
            <ActionIconButton
              label="Edit Permission"
              icon={<Pencil size={18} aria-hidden="true" />}
              to={`/permissions/${id}/edit`}
            />
          )}
        </div>
      </div>
      <Alert msg={error} />
      <section className="surface full">
        <h2>Permission Information</h2>
        <div className="detail-grid">
          <Detail label="Permission Code" value={permission.code} />
          <Detail label="Permission Name" value={permission.name} />
          <Detail label="Description" value={permission.description || "-"} />
          <Detail label="Assigned Users" value={permission.assignedUsers} />
          <Detail
            label="Created At"
            value={new Date(permission.createdAt).toLocaleString()}
          />
          <Detail
            label="Updated At"
            value={new Date(permission.updatedAt).toLocaleString()}
          />
        </div>
      </section>
      <section className="surface full detail-section">
        <h2>Access Matrix</h2>
        <PermissionMatrix
          catalog={catalog}
          selected={selected}
          onChange={() => {}}
          readOnly
        />
      </section>
      <section className="surface full detail-section">
        <h2>Current Impact</h2>
        <div className="impact-grid">
          <Detail
            label="Active Assignments"
            value={permission.impact?.activeAssignments ?? 0}
          />
          <Detail
            label="Active Users"
            value={permission.impact?.activeUsers ?? 0}
          />
          <Detail
            label="Active Sessions"
            value={permission.impact?.activeSessions ?? 0}
          />
        </div>
      </section>
    </DashboardLayout>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <span className="detail-label">{label}</span>
      <div className="readonly-value">{value}</div>
    </div>
  );
}
