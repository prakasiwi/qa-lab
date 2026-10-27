import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Alert } from "../Alert";
import { PublicAuthLayout } from "./PublicAuthLayout";

export function AuthForm({
  title,
  description,
  message,
  error,
  children,
  footer,
}) {
  return (
    <PublicAuthLayout>
      <section className="login-card auth-card" aria-labelledby="auth-title">
        <header className="login-card-header">
          <h1 id="auth-title">{title}</h1>
          <p>{description}</p>
        </header>
        <div aria-live="polite">
          <Alert msg={error} />
          <Alert msg={message} type="success" />
        </div>
        {children}
        {footer || (
          <p className="auth-links">
            <Link to="/login">Back to login</Link>
          </p>
        )}
      </section>
    </PublicAuthLayout>
  );
}
export function TextField({ label, required, error, ...props }) {
  const id = props.id || props.name;
  return (
    <label className="field" htmlFor={id}>
      <span>
        {label} {required && <b>*</b>}
      </span>
      <input
        id={id}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
      {error && (
        <small id={`${id}-error`} className="error">
          {error}
        </small>
      )}
    </label>
  );
}
export function PasswordField({
  label = "Password",
  required,
  error,
  ...props
}) {
  const [shown, setShown] = useState(false);
  const id = props.id || props.name;
  return (
    <div className="field">
      <label htmlFor={id}>
        <span>
          {label} {required && <b>*</b>}
        </span>
      </label>
      <div className="auth-password">
        <input
          id={id}
          type={shown ? "text" : "password"}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShown(!shown)}
          aria-label={`${shown ? "Hide" : "Show"} ${label.toLowerCase()}`}
        >
          {shown ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error && (
        <small id={`${id}-error`} className="error">
          {error}
        </small>
      )}
    </div>
  );
}
export function SubmitButton({
  loading,
  disabled = false,
  children,
  ...props
}) {
  return (
    <button
      className="login-submit"
      type="submit"
      disabled={loading || disabled}
      {...props}
    >
      {loading ? "Please wait..." : children}
    </button>
  );
}
