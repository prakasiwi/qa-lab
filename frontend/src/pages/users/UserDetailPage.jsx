import { ArrowLeft, Pencil, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  getUser,
  resendUserInvitation,
  resendUserVerification,
} from "../../api/userApi";
import { useAllowedAction } from "../../auth/permissions";
import { ActionIconButton } from "../../components/ActionIconButton";
import { Alert } from "../../components/Alert";
import { DashboardLayout } from "../../layouts/DashboardLayout";
import { getErrorMessage, isForbiddenError } from "../../utils/apiErrors";

export function UserDetailPage() {
  const canManageUsers = useAllowedAction("iam_users:manage");
  const canManagePermissions = useAllowedAction("iam_permissions:manage");
  const canManage = canManageUsers && canManagePermissions;
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(
    location.state?.deliveryStatus === "FAILED"
      ? "User was created, but invitation delivery failed. You can resend it below."
      : "",
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const busyRef = useRef(false);
  const load = useCallback(() => {
    setLoading(true);
    return getUser(id)
      .then(({ data }) => setUser(data.data))
      .catch((requestError) => {
        setUser(null);
        if (isForbiddenError(requestError))
          navigate("/forbidden", { replace: true });
        else setError(getErrorMessage(requestError, "Unable to load user."));
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setInterval(
      () => setCooldown((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => clearInterval(timer);
  }, [cooldown]);
  async function resend() {
    if (busyRef.current || cooldown) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (user.status === "PENDING_ACTIVATION") await resendUserInvitation(id);
      else await resendUserVerification(id);
      setMessage("Email accepted for delivery.");
      setCooldown(60);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  if (loading && !user)
    return (
      <DashboardLayout>
        <p role="status">Loading user...</p>
      </DashboardLayout>
    );
  if (!user)
    return (
      <DashboardLayout>
        <Alert msg={error || "User was not found."} />
        <Link className="detail-back-link" to="/users">
          <ArrowLeft size={18} /> Back
        </Link>
      </DashboardLayout>
    );
  const canResend = ["PENDING_ACTIVATION", "PENDING_VERIFICATION"].includes(
    user.status,
  );
  const createdAt = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(user.createdAt));
  return (
    <DashboardLayout>
      <div className="breadcrumb">IAM / Users / User Details</div>
      <Link className="detail-back-link user-back-link" to="/users">
        <ArrowLeft size={18} /> Back to Users
      </Link>
      <div className="page-head user-page-heading">
        <div className="heading-with-badge">
          <h1>User Details</h1>
          <span className={`badge status-${user.status.toLowerCase()}`}>
            {user.status.replaceAll("_", " ")}
          </span>
        </div>
        <div className="detail-header-actions">
          {canManage && (
            <ActionIconButton
              label="Edit User"
              icon={<Pencil size={18} />}
              to={`/users/${id}/edit`}
            />
          )}
        </div>
      </div>
      <Alert msg={error} />
      <Alert msg={message} type="success" />
      <section className="surface full user-card">
        <h2>Personal Information</h2>
        <div className="user-detail-grid">
          <Detail label="Name" value={user.name} />
          <Detail label="Email" value={user.email} />
          <Detail label="Phone Number" value={user.phone} />
          <Detail
            label="Email Verification"
            value={
              <span
                className={`badge ${user.identifierVerifiedAt ? "status-active" : "status-pending_verification"}`}
              >
                {user.identifierVerifiedAt ? "Verified" : "Not verified"}
              </span>
            }
          />
          <Detail label="Created / Invited" value={createdAt} />
        </div>
      </section>
      <section className="surface full user-card detail-section">
        <h2>Security</h2>
        <div className="mfa-control readonly">
          <div className="mfa-copy">
            <ShieldCheck size={28} aria-hidden="true" />
            <div>
              <strong>Require MFA</strong>
              <p>Require an email OTP at every sign-in.</p>
            </div>
          </div>
          <span
            className={`switch-control readonly ${user.mfaEnabled ? "is-on" : ""}`}
            aria-label={`MFA ${user.mfaEnabled ? "on" : "off"}`}
          >
            <span aria-hidden="true" />
          </span>
          <strong className="switch-state">
            {user.mfaEnabled ? "ON" : "OFF"}
          </strong>
        </div>
        <small className="mfa-readonly">Read-only</small>
      </section>
      <section className="surface full user-card detail-section">
        <h2>Access Assignments</h2>
        <div className="table-wrap user-access-detail">
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Role</th>
                <th>Permission</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {user.accesses.map((access, index) => (
                <tr key={access.id}>
                  <td>{index + 1}</td>
                  <td>{access.role.name}</td>
                  <td>{access.permission.name}</td>
                  <td>
                    <span
                      className={`badge ${access.isActive ? "status-active" : "status-inactive"}`}
                    >
                      {access.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {canManage && canResend ? (
        <ResendPanel
          user={user}
          busy={busy}
          cooldown={cooldown}
          onResend={resend}
        />
      ) : null}
    </DashboardLayout>
  );
}
function ResendPanel({ user, busy, cooldown, onResend }) {
  const label =
    user.status === "PENDING_ACTIVATION"
      ? "Resend Invitation"
      : "Resend Verification Email";
  return (
    <section className="surface full invitation-panel detail-section">
      <div>
        <h2>
          {user.status === "PENDING_ACTIVATION" ? "Invitation" : "Verification"}
        </h2>
        <strong>
          {user.status === "PENDING_ACTIVATION"
            ? "Invitation pending"
            : "Verification pending"}
        </strong>
        <p className="muted">
          This user has not completed the required account step.
        </p>
      </div>
      <button
        type="button"
        className="primary"
        disabled={busy || cooldown > 0}
        onClick={onResend}
      >
        {cooldown ? `Retry in ${cooldown}s` : label}
      </button>
    </section>
  );
}
function Detail({ label, value }) {
  return (
    <div>
      <span className="detail-label">{label}</span>
      <div className="readonly-value">{value || "-"}</div>
    </div>
  );
}
