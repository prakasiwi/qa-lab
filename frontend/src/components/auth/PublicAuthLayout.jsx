import qaLabLogo from "../../assets/logo.png";

export function PublicAuthLayout({ children }) {
  return (
    <main className="login-page">
      <section className="login-brand-panel" aria-label="QA Lab introduction">
        <div className="login-brand-content">
          <img src={qaLabLogo} alt="QA Lab" className="login-brand-logo" />
          <h1>
            Learn QA through
            <br />a real application
          </h1>
          <p>
            A simple invoice management app for manual testing, API testing, and
            automation.
          </p>
        </div>
        <div className="login-dot-pattern" aria-hidden="true" />
      </section>

      <section className="login-form-panel" aria-label="Authentication">
        {children}
      </section>
    </main>
  );
}
