import warehouseIllustration from "../assets/in-development-warehouse.png";
import { DashboardLayout } from "../layouts/DashboardLayout";

export function ComingSoonPage({ moduleName }) {
  return (
    <DashboardLayout>
      <section
        className="in-development-page"
        aria-labelledby="in-development-title"
      >
        <div className="in-development-content">
          <img
            src={warehouseIllustration}
            alt=""
            aria-hidden="true"
            className="in-development-illustration"
          />
          <span className="in-development-badge">In Development</span>
          <h1 id="in-development-title">Something new is on the way</h1>
          <p>We&apos;re working on the {moduleName} module.</p>
          <p>Check back soon for updates.</p>
        </div>
      </section>
    </DashboardLayout>
  );
}
