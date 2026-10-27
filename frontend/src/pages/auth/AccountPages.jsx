import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Check, Clock3, Mail, UserRound } from "lucide-react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  activateAccount,
  activationContext,
  forgotPassword,
  register,
  resendResetPassword,
  resendVerification,
  resetContext,
  resetPassword,
  verifyIdentifier,
} from "../../api/authApi";
import {
  AuthForm,
  PasswordField,
  SubmitButton,
  TextField,
} from "../../components/auth/AuthForm";
import { getErrorMessage } from "../../utils/apiErrors";
import {
  NAME_INPUT_CONSTRAINTS,
  PASSWORD_INPUT_CONSTRAINTS,
} from "../../auth/authConstraints";
import { captureQueryParams, scrubQueryParams } from "../../auth/sensitiveUrl";

const initialAccount = {
  name: "",
  phone: "",
  email: "",
  password: "",
  confirmPassword: "",
};
const RESET_REQUEST_CONTEXT_KEY = "qa-lab:reset-request";

function useAuthAction(action, successText) {
  const [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const inFlight = useRef(false);
  const submit = async (payload) => {
    if (inFlight.current) return false;
    inFlight.current = true;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await action(payload);
      setMessage(response.data.message || successText);
      return true;
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "The request could not be completed. Please try again.",
        ),
      );
      return false;
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  };
  return { loading, error, message, submit };
}

function PasswordFields({ form, update }) {
  return (
    <>
      <PasswordField
        name="password"
        label="Password"
        {...PASSWORD_INPUT_CONSTRAINTS}
        autoComplete="new-password"
        value={form.password}
        onChange={(e) => update("password", e.target.value)}
        required
      />
      <PasswordField
        name="confirmPassword"
        label="Confirm password"
        {...PASSWORD_INPUT_CONSTRAINTS}
        autoComplete="new-password"
        value={form.confirmPassword}
        onChange={(e) => update("confirmPassword", e.target.value)}
        required
      />
      <small>{PASSWORD_INPUT_CONSTRAINTS.title}</small>
    </>
  );
}

export function RegisterPage() {
  const [form, setForm] = useState(initialAccount);
  const request = useAuthAction(register);
  const navigate = useNavigate();
  const update = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    if (await request.submit(form))
      navigate("/check-email", {
        replace: true,
        state: { email: form.email.trim() },
      });
  };
  return (
    <AuthForm
      title="Create an account"
      description="Register, then verify your email to activate your account."
      {...request}
    >
      <form className="auth-form" onSubmit={submit}>
        <TextField
          name="name"
          label="Full name"
          placeholder="e.g. John Doe"
          autoComplete="name"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          required
          {...NAME_INPUT_CONSTRAINTS}
        />
        <TextField
          name="phone"
          label="Phone (optional)"
          placeholder="e.g. +1 234 567 8900"
          type="tel"
          autoComplete="tel"
          value={form.phone}
          onChange={(e) => update("phone", e.target.value)}
        />
        <TextField
          name="email"
          label="Email"
          placeholder="e.g. john@example.com"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          required
        />
        <PasswordFields form={form} update={update} />
        <SubmitButton loading={request.loading}>Register</SubmitButton>
      </form>
    </AuthForm>
  );
}

export function CheckEmailPage() {
  const location = useLocation();
  const [email] = useState(location.state?.email || "");
  const [cooldown, setCooldown] = useState(60);
  const resend = useAuthAction(resendVerification);
  useEffect(() => {
    if (!cooldown) return undefined;
    const timer = window.setInterval(
      () => setCooldown((seconds) => Math.max(0, seconds - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [cooldown]);
  const submit = async () => {
    if (await resend.submit({ email })) setCooldown(60);
  };
  return (
    <AuthForm
      title="Check your email"
      description=""
      error={resend.error}
      message={resend.message}
    >
      <div className="auth-state">
        <div className="auth-state-icon auth-state-icon-info">
          <Mail aria-hidden="true" size={54} />
        </div>
        <p>
          We&apos;ve sent a verification link to{" "}
          <strong>{email || "your email address"}</strong>. Please check your
          inbox to activate your account.
        </p>
        <small>Check your spam folder if you don&apos;t see the email.</small>
        <button
          type="button"
          className="login-submit"
          disabled={resend.loading || cooldown > 0 || !email}
          onClick={submit}
        >
          {cooldown ? "Resend Verification Email" : "Resend Verification Email"}
        </button>
        {cooldown > 0 && <small>Resend available in {cooldown}s</small>}
      </div>
    </AuthForm>
  );
}

export function VerifyIdentifierPage() {
  const [params] = useSearchParams();
  const captured = useRef(captureQueryParams(params, ["token"]));
  const [token] = useState(captured.current.token);
  const [email, setEmail] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [state, setState] = useState(token ? "confirm" : "unavailable");
  const verify = useAuthAction(verifyIdentifier);
  const resend = useAuthAction(resendVerification);
  useLayoutEffect(
    () => scrubQueryParams(window.location, window.history, ["token"]),
    [],
  );
  useEffect(() => {
    if (!cooldown) return;
    const id = setInterval(() => setCooldown((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);
  const confirm = async () => {
    if (await verify.submit({ token })) setState("success");
    else setState("expired");
  };
  const resendLink = async (event) => {
    event.preventDefault();
    if (await resend.submit({ email })) setCooldown(60);
  };
  if (state === "success")
    return (
      <AuthForm
        title="Email verified"
        description="Your account is active. You can now sign in to QA Lab."
        footer={
          <Link className="login-submit" to="/login">
            Back to login
          </Link>
        }
      >
        <div className="auth-state">
          <div className="auth-state-icon auth-state-icon-success">
            <Check aria-hidden="true" size={54} />
          </div>
        </div>
      </AuthForm>
    );
  if (state === "confirm")
    return (
      <AuthForm
        title="Verify your email"
        description="Confirm your email address to activate your account."
        error={verify.error}
      >
        <div className="auth-state">
          <div className="auth-state-icon auth-state-icon-info">
            <Mail aria-hidden="true" size={54} />
          </div>
          <SubmitButton
            loading={verify.loading}
            disabled={!token}
            onClick={confirm}
          >
            Verify Email
          </SubmitButton>
        </div>
      </AuthForm>
    );
  const isExpired = state === "expired";
  return (
    <AuthForm
      title={
        isExpired
          ? "Verification link expired"
          : "Verification link unavailable"
      }
      description={
        isExpired
          ? "This verification link has expired. Request a new email to continue."
          : "This link is invalid or no longer available. Request a new verification email."
      }
      error={verify.error || resend.error}
      message={resend.message}
    >
      <div className="auth-state">
        <div className="auth-state-icon auth-state-icon-warning">
          <Clock3 aria-hidden="true" size={54} />
        </div>
        <form className="auth-form" onSubmit={resendLink}>
          <TextField
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <SubmitButton loading={resend.loading} disabled={cooldown > 0}>
            {cooldown
              ? `Resend available in ${cooldown}s`
              : "Resend Verification Email"}
          </SubmitButton>
        </form>
      </div>
    </AuthForm>
  );
}

export function ActivateAccountPage() {
  const [params] = useSearchParams();
  const captured = useRef(captureQueryParams(params, ["token"]));
  const token = captured.current.token;
  const [invitation, setInvitation] = useState(null);
  const [state, setState] = useState("loading");
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const request = useAuthAction(activateAccount);
  useLayoutEffect(
    () => scrubQueryParams(window.location, window.history, ["token"]),
    [],
  );
  useEffect(() => {
    let active = true;
    if (!token) {
      setState("unavailable");
      return undefined;
    }
    activationContext(token)
      .then((response) => {
        if (active) {
          setInvitation(response.data.data);
          setState("ready");
        }
      })
      .catch(() => {
        if (active) setState("expired");
      });
    return () => {
      active = false;
    };
  }, [token]);
  const update = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    if (await request.submit({ ...form, token })) setState("success");
  };
  if (state === "loading")
    return (
      <AuthForm
        title="Activate your account"
        description="Checking your invitation…"
      >
        <div className="auth-state">
          <div className="auth-state-icon auth-state-icon-info">
            <Mail aria-hidden="true" size={54} />
          </div>
        </div>
      </AuthForm>
    );
  if (state === "success")
    return (
      <AuthForm
        title="Account activated"
        description="Your account is ready. Sign in to start using QA Lab."
        footer={
          <Link className="login-submit" to="/login">
            Back to login
          </Link>
        }
      >
        <div className="auth-state">
          <div className="auth-state-icon auth-state-icon-success">
            <Check aria-hidden="true" size={54} />
          </div>
        </div>
      </AuthForm>
    );
  if (state !== "ready")
    return (
      <AuthForm
        title={
          state === "expired"
            ? "Invitation link expired"
            : "Invitation link unavailable"
        }
        description={
          state === "expired"
            ? "This invitation link has expired. Please contact your administrator to request a new invitation."
            : "This invitation link is invalid or no longer available. Please contact your administrator."
        }
        footer={
          <Link className="login-submit" to="/login">
            Back to login
          </Link>
        }
      >
        <div className="auth-state">
          <div className="auth-state-icon auth-state-icon-warning">
            <Clock3 aria-hidden="true" size={54} />
          </div>
        </div>
      </AuthForm>
    );
  return (
    <AuthForm
      title="Activate your account"
      description="Set your password to start using QA Lab."
      error={request.error}
    >
      <form className="auth-form" onSubmit={submit}>
        <div className="invitation-identity">
          <span className="invitation-avatar">
            <UserRound aria-hidden="true" size={29} />
          </span>
          <div>
            <strong>{invitation.name}</strong>
            <small>{invitation.email}</small>
          </div>
        </div>
        <PasswordFields form={form} update={update} />
        <SubmitButton loading={request.loading}>Activate Account</SubmitButton>
      </form>
    </AuthForm>
  );
}
export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const captured = useRef(captureQueryParams(params, ["token"]));
  const token = captured.current.token;
  const [state, setState] = useState("loading");
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const request = useAuthAction(resetPassword);
  useLayoutEffect(
    () => scrubQueryParams(window.location, window.history, ["token"]),
    [],
  );
  useEffect(() => {
    let active = true;
    if (!token) {
      setState("unavailable");
      return undefined;
    }
    resetContext(token)
      .then(() => {
        if (active) setState("ready");
      })
      .catch(() => {
        if (active) setState("expired");
      });
    return () => {
      active = false;
    };
  }, [token]);
  const update = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    if (await request.submit({ ...form, token })) setState("success");
    else setState("expired");
  };
  if (state === "loading")
    return (
      <AuthForm
        title="Reset your password"
        description="Checking your reset link…"
      >
        <div className="auth-state">
          <div className="auth-state-icon auth-state-icon-info">
            <Mail aria-hidden="true" size={54} />
          </div>
        </div>
      </AuthForm>
    );
  if (state === "success")
    return (
      <AuthForm
        title="Password reset successful"
        description="Your password has been updated. You’ve been signed out on all devices."
        footer={
          <Link className="login-submit" to="/login">
            Back to login
          </Link>
        }
      >
        <div className="auth-state">
          <div className="auth-state-icon auth-state-icon-success">
            <Check aria-hidden="true" size={54} />
          </div>
        </div>
      </AuthForm>
    );
  if (state !== "ready")
    return (
      <AuthForm
        title={
          state === "expired" ? "Reset link expired" : "Reset link unavailable"
        }
        description={
          state === "expired"
            ? "This password reset link has expired. Request a new link to continue."
            : "This link is invalid or no longer available. Request a new password reset link."
        }
        footer={
          <>
            <Link className="login-submit" to="/forgot-password">
              Request New Link
            </Link>
            <p className="auth-links">
              <Link to="/login">Back to login</Link>
            </p>
          </>
        }
      >
        <div className="auth-state">
          <div className="auth-state-icon auth-state-icon-warning">
            <Clock3 aria-hidden="true" size={54} />
          </div>
        </div>
      </AuthForm>
    );
  return (
    <AuthForm
      title="Reset your password"
      description="Enter a new password for your account."
      error={request.error}
    >
      <form className="auth-form" onSubmit={submit}>
        <PasswordFields form={form} update={update} />
        <SubmitButton loading={request.loading}>Reset Password</SubmitButton>
      </form>
    </AuthForm>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const request = useAuthAction(forgotPassword);
  const navigate = useNavigate();
  const submit = async (event) => {
    event.preventDefault();
    if (await request.submit({ email })) {
      const context = {
        email: email.trim(),
        resendAvailableAt: Date.now() + 60_000,
      };
      sessionStorage.setItem(
        RESET_REQUEST_CONTEXT_KEY,
        JSON.stringify(context),
      );
      navigate("/check-reset-email", { replace: true });
    }
  };
  return (
    <AuthForm
      title="Forgot password?"
      description="Enter your email to request a password reset link."
      {...request}
    >
      <form className="auth-form" onSubmit={submit}>
        <TextField
          name="email"
          label="Email"
          placeholder="Enter your email address"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <SubmitButton loading={request.loading}>Send Reset Link</SubmitButton>
      </form>
    </AuthForm>
  );
}

export function CheckResetEmailPage() {
  const navigate = useNavigate();
  const [context] = useState(() => {
    try {
      return JSON.parse(
        sessionStorage.getItem(RESET_REQUEST_CONTEXT_KEY) || "null",
      );
    } catch {
      return null;
    }
  });
  const [cooldown, setCooldown] = useState(() =>
    Math.max(
      0,
      Math.ceil(((context?.resendAvailableAt || 0) - Date.now()) / 1000),
    ),
  );
  const request = useAuthAction(resendResetPassword);
  useEffect(() => {
    if (!context?.email) navigate("/forgot-password", { replace: true });
  }, [context, navigate]);
  useEffect(() => {
    if (!cooldown) return undefined;
    const timer = window.setInterval(
      () => setCooldown((seconds) => Math.max(0, seconds - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [cooldown]);
  const resend = async () => {
    if (await request.submit({ email: context?.email })) {
      const resendAvailableAt = Date.now() + 60_000;
      sessionStorage.setItem(
        RESET_REQUEST_CONTEXT_KEY,
        JSON.stringify({ ...context, resendAvailableAt }),
      );
      setCooldown(60);
    }
  };
  if (!context?.email) return null;
  return (
    <AuthForm
      title="Check your email"
      description=""
      error={request.error}
      message={request.message}
    >
      <div className="auth-state">
        <div className="auth-state-icon auth-state-icon-info">
          <Mail aria-hidden="true" size={54} />
        </div>
        <p>
          If your email is registered and eligible, we&apos;ll send you a
          password reset link.
        </p>
        <small>Check your inbox and spam folder.</small>
        <button
          type="button"
          className="login-submit"
          disabled={request.loading || cooldown > 0}
          onClick={resend}
        >
          Resend Reset Email
        </button>
        {cooldown > 0 && <small>Resend available in {cooldown}s</small>}
      </div>
    </AuthForm>
  );
}
