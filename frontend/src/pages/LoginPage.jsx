import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { login, resendMfa, selectRole, verifyMfa } from "../api/authApi";
import { authSession } from "../auth/authSession";
import {
  AuthForm,
  PasswordField,
  SubmitButton,
  TextField,
} from "../components/auth/AuthForm";
import { getErrorMessage } from "../utils/apiErrors";
import { firstAllowedPath } from "../utils/authDestination";
import {
  isNoActiveRoleError,
  loginStageFromResponse,
  normalizeOtp,
  OTP_LIFETIME_SECONDS,
  resendOtpState,
  RESEND_COOLDOWN_SECONDS,
  sortRoles,
} from "../auth/loginFlow";

export function LoginPage() {
  return <LoginFlowPage />;
}

export function LoginFlowPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [stage, setStage] = useState("CREDENTIALS");
  const [form, setForm] = useState({ email: "", password: "" });
  const [challengeId, setChallengeId] = useState("");
  const [selection, setSelection] = useState(null);
  const [roleId, setRoleId] = useState("");
  const [otp, setOtp] = useState("");
  const [expiresIn, setExpiresIn] = useState(OTP_LIFETIME_SECONDS);
  const [resendIn, setResendIn] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  useEffect(() => {
    if (stage !== "OTP") return undefined;
    const timer = window.setInterval(() => {
      setExpiresIn((value) => Math.max(0, value - 1));
      setResendIn((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [stage]);

  const run = async (action, fallback) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setError("");
    try {
      await action();
    } catch (requestError) {
      setError(getErrorMessage(requestError, fallback));
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  };
  const finish = async () => {
    const user = await authSession.establish();
    if (!user)
      throw new Error(
        "Your session could not be verified. Please sign in again.",
      );
    navigate(location.state?.from?.pathname || firstAllowedPath(user), {
      replace: true,
    });
  };
  const acceptStep = (data) => {
    const next = loginStageFromResponse(data);
    if (next.stage === "OTP") {
      setChallengeId(next.challengeId);
      setOtp("");
      setExpiresIn(OTP_LIFETIME_SECONDS);
      setResendIn(RESEND_COOLDOWN_SECONDS);
      setStage("OTP");
      return;
    }
    if (next.stage === "ROLE") {
      setSelection(next.selection);
      setRoleId("");
      setStage("ROLE");
      return;
    }
    throw new Error("Your sign-in session is invalid. Please sign in again.");
  };
  const reset = () => {
    setStage("CREDENTIALS");
    setChallengeId("");
    setSelection(null);
    setOtp("");
    setRoleId("");
    setError("");
  };
  const submitCredentials = (event) => {
    event.preventDefault();
    run(async () => {
      try {
        acceptStep((await login(form)).data.data);
      } catch (requestError) {
        if (isNoActiveRoleError(requestError)) {
          setSelection({ roles: [] });
          setStage("ROLE");
          return;
        }
        throw requestError;
      }
    }, "Invalid email or password.");
  };
  const submitOtp = (event) => {
    event.preventDefault();
    if (!expiresIn) {
      setError("This code has expired. Request a new code to continue.");
      return;
    }
    run(
      async () => acceptStep((await verifyMfa({ challengeId, otp })).data.data),
      "The verification code is invalid or expired.",
    );
  };
  const resend = () =>
    run(async () => {
      const state = resendOtpState(
        (await resendMfa({ challengeId })).data.data.challengeId,
      );
      setChallengeId(state.challengeId);
      setOtp(state.otp);
      setExpiresIn(state.expiresIn);
      setResendIn(state.resendIn);
    }, "Unable to resend the verification code.");
  const submitRole = (event) => {
    event.preventDefault();
    run(async () => {
      await selectRole({ selectionProof: selection.selectionProof, roleId });
      await finish();
    }, "Your sign-in session has expired. Please sign in again.");
  };

  if (stage === "OTP") {
    const countdown = `${String(Math.floor(expiresIn / 60)).padStart(2, "0")}:${String(expiresIn % 60).padStart(2, "0")}`;
    return (
      <AuthForm
        title="Verify your email"
        description="Enter the 6-digit code sent to your email address."
        error={error}
        footer={
          <button className="auth-link-button" type="button" onClick={reset}>
            Back to login
          </button>
        }
      >
        <form className="auth-form" onSubmit={submitOtp}>
          <TextField
            name="otp"
            label="Verification code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength="6"
            value={otp}
            onChange={(event) => setOtp(normalizeOtp(event.target.value))}
            required
          />
          <p className="muted">Code expires in {countdown}</p>
          <SubmitButton
            loading={loading}
            disabled={!expiresIn || otp.length !== 6}
          >
            Verify
          </SubmitButton>
          <button
            type="button"
            className="auth-link-button"
            onClick={resend}
            disabled={loading || resendIn > 0}
          >
            {resendIn ? `Resend available in ${resendIn}s` : "Resend OTP"}
          </button>
        </form>
      </AuthForm>
    );
  }
  if (stage === "ROLE") {
    const roles = sortRoles(selection?.roles);
    return (
      <AuthForm
        title="Select Role"
        description="Choose a role to continue."
        error={error}
        footer={
          <button className="auth-link-button" type="button" onClick={reset}>
            Back to login
          </button>
        }
      >
        {roles.length === 0 ? (
          <p role="status">
            No active role assigned. Please contact your administrator.
          </p>
        ) : (
          <form className="auth-form" onSubmit={submitRole}>
            <label className="field" htmlFor="role">
              <span>
                Role <b>*</b>
              </span>
              <select
                id="role"
                name="role"
                value={roleId}
                onChange={(event) => setRoleId(event.target.value)}
                required
              >
                <option value="">Select role</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name || role.code}
                  </option>
                ))}
              </select>
            </label>
            <SubmitButton loading={loading} disabled={!roleId}>
              Continue
            </SubmitButton>
          </form>
        )}
      </AuthForm>
    );
  }
  return (
    <AuthForm
      title="Welcome back"
      description="Sign in to continue to QA Lab."
      error={error}
    >
      <form className="auth-form" onSubmit={submitCredentials}>
        <TextField
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(event) =>
            setForm((current) => ({ ...current, email: event.target.value }))
          }
          required
        />
        <div>
          <PasswordField
            name="password"
            label="Password"
            autoComplete="current-password"
            value={form.password}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                password: event.target.value,
              }))
            }
            required
          />
          <p className="auth-links">
            <Link to="/forgot-password">Forgot password?</Link>
          </p>
        </div>
        <SubmitButton loading={loading}>Login</SubmitButton>
      </form>
      <p className="login-registration-prompt">
        Don't have an account? <Link to="/register">Create account</Link>
      </p>
    </AuthForm>
  );
}
