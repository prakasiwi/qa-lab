import { useEffect, useState } from "react";
import { Eye, EyeOff, Info, Lock, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { login } from "../api/authApi";
import { Alert } from "../components/Alert";
import qaLabLogo from "../assets/logo.png";

export function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "admin@example.com",
    password: "password123",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    if (localStorage.getItem("token")) navigate("/");
  }, [navigate]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setApiError("");

    try {
      const response = await login(form);
      localStorage.setItem("token", response.data.data.token);
      navigate("/");
    } catch (error) {
      setApiError(error.response?.data?.message || "Login gagal. Periksa email dan password.");
    } finally {
      setLoading(false);
    }
  }

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <main className="login-page">
      <section className="login-brand-panel">
        <div className="login-brand-content">
          <img src={qaLabLogo} alt="QA Lab" className="login-brand-logo" />

          <h1>
            Learn QA through
            <br />
            a real application
          </h1>

          <p>
            A simple invoice management app for manual testing, API testing, and automation.
          </p>
        </div>

        <div className="login-dot-pattern" aria-hidden="true" />
      </section>

      <section className="login-form-panel">
        <form className="login-card" onSubmit={handleSubmit}>
          <div className="login-card-header">
            <h2>Welcome back</h2>
            <p>Sign in to continue to QA Lab</p>
          </div>

          <Alert msg={apiError} />

          <label className="field">
            <span>Email</span>
            <div className="login-input-wrap">
              <Mail size={18} aria-hidden="true" />
              <input
                type="email"
                name="email"
                autoComplete="email"
                value={form.email}
                onChange={(event) => update("email", event.target.value)}
                placeholder="admin@example.com"
                required
              />
            </div>
          </label>

          <label className="field">
            <span>Password</span>
            <div className="login-input-wrap">
              <Lock size={18} aria-hidden="true" />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                value={form.password}
                onChange={(event) => update("password", event.target.value)}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>

          <div className="login-default-account">
            <Info size={17} aria-hidden="true" />
            <span>
              Default account:
              <strong>admin@example.com / password123</strong>
            </span>
          </div>
        </form>
      </section>
    </main>
  );
}
