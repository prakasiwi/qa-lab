import { ArrowLeft, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getRole } from "../../api/roleApi";
import { useAllowedAction } from "../../auth/permissions";
import { Alert } from "../../components/Alert";
import { ActionIconButton } from "../../components/ActionIconButton";
import { DashboardLayout } from "../../layouts/DashboardLayout";
import { getErrorMessage, isForbiddenError } from "../../utils/apiErrors";

export function RoleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const canManage = useAllowedAction("iam_roles:manage");
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getRole(id)
      .then(({ data }) => setRole(data.data))
      .catch((requestError) => {
        if (isForbiddenError(requestError))
          navigate("/forbidden", { replace: true });
        else setError(getErrorMessage(requestError, "Unable to load role."));
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading)
    return (
      <DashboardLayout>
        <p role="status" className="muted">
          Loading role…
        </p>
      </DashboardLayout>
    );
  if (!role)
    return (
      <DashboardLayout>
        <Alert msg={error || "Role was not found."} />
        <Link className="neutral button-link" to="/roles">
          <ArrowLeft size={18} aria-hidden="true" /> Back
        </Link>
      </DashboardLayout>
    );

  return (
    <DashboardLayout>
      <div className="breadcrumb">IAM / Role / Role Details</div>
      <div className="detail-back">
        <Link className="detail-back-link" to="/roles">
          <ArrowLeft size={18} aria-hidden="true" /> Back
        </Link>
      </div>
      <div className="page-head detail-page-head">
        <div className="heading-with-badge">
          <h1>Role Details</h1>
          <span
            className={`badge ${role.isActive ? "status-active" : "status-inactive"}`}
          >
            {role.isActive ? "ACTIVE" : "INACTIVE"}
          </span>
        </div>
        <div className="detail-header-actions">
          {canManage && (
            <ActionIconButton
              label="Edit Role"
              icon={<Pencil size={18} aria-hidden="true" />}
              to={`/roles/${id}/edit`}
            />
          )}
        </div>
      </div>
      <Alert msg={error} />
      <section className="surface full">
        <h2>Role Information</h2>
        <div className="detail-grid">
          <Detail label="Role Code" value={role.code} />
          <Detail label="Role Name" value={role.name} />
          <Detail label="Description" value={role.description || "-"} />
          <Detail label="Assigned Users" value={role.assignedUsers} />
          <Detail
            label="Created At"
            value={new Date(role.createdAt).toLocaleString()}
          />
          <Detail
            label="Updated At"
            value={new Date(role.updatedAt).toLocaleString()}
          />
        </div>
      </section>
      <section className="surface full detail-section">
        <h2>Current Impact</h2>
        <div className="impact-grid">
          <Detail
            label="Active Assignments"
            value={role.impact?.activeAssignments ?? 0}
          />
          <Detail label="Active Users" value={role.impact?.activeUsers ?? 0} />
          <Detail
            label="Active Sessions"
            value={role.impact?.activeSessions ?? 0}
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
