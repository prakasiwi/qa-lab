import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { DashboardPage } from "../pages/DashboardPage";
import { LoginPage } from "../pages/LoginPage";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { CustomerDetailPage } from "../pages/customers/CustomerDetailPage";
import { CustomerFormPage } from "../pages/customers/CustomerFormPage";
import CustomersPage from "../pages/customers/CustomersPage";
import CreateInvoicePage from "../pages/invoices/CreateInvoicePage";
import { InvoiceDetailPage } from "../pages/invoices/InvoiceDetailPage";
import InvoicesPage from "../pages/invoices/InvoicesPage";
import { ProductDetailPage } from "../pages/products/ProductDetailPage";
import { ProductFormPage } from "../pages/products/ProductFormPage";
import ProductsPage from "../pages/products/ProductsPage";
import {
  ActivateAccountPage,
  CheckEmailPage,
  CheckResetEmailPage,
  ForgotPasswordPage,
  RegisterPage,
  ResetPasswordPage,
  VerifyIdentifierPage,
} from "../pages/auth/AccountPages";
import { AdminRoute } from "../components/AdminRoute";
import { UsersPage } from "../pages/users/UsersPage";
import { UserFormPage } from "../pages/users/UserFormPage";
import { UserDetailPage } from "../pages/users/UserDetailPage";
import { PermissionRoute } from "../components/PermissionRoute";
import { RolesPage } from "../pages/roles/RolesPage";
import { RoleFormPage } from "../pages/roles/RoleFormPage";
import { RoleDetailPage } from "../pages/roles/RoleDetailPage";
import { PermissionsPage } from "../pages/permissions/PermissionsPage";
import { PermissionFormPage } from "../pages/permissions/PermissionFormPage";
import { PermissionDetailPage } from "../pages/permissions/PermissionDetailPage";
import { useAuthSession } from "../auth/useAuthSession";

const protectedPage = (page) => <ProtectedRoute>{page}</ProtectedRoute>;
const permissionPage = (action, page) => (
  <PermissionRoute action={action}>{page}</PermissionRoute>
);

export function AppRoutes() {
  return (
    <BrowserRouter>
      <RoleScopedRoutes />
    </BrowserRouter>
  );
}

function RoleScopedRoutes() {
  const session = useAuthSession();
  return (
    <Routes key={session.generation}>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/check-email" element={<CheckEmailPage />} />
      <Route path="/verify-identifier" element={<VerifyIdentifierPage />} />
      <Route path="/activate-account" element={<ActivateAccountPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/check-reset-email" element={<CheckResetEmailPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/"
        element={permissionPage("dashboard:view", <DashboardPage />)}
      />
      <Route
        path="/dashboard"
        element={permissionPage("dashboard:view", <DashboardPage />)}
      />
      <Route
        path="/customers"
        element={permissionPage("customers:view", <CustomersPage />)}
      />
      <Route
        path="/customers/new"
        element={permissionPage("customers:create", <CustomerFormPage />)}
      />
      <Route
        path="/customers/:id"
        element={permissionPage("customers:view", <CustomerDetailPage />)}
      />
      <Route
        path="/customers/:id/edit"
        element={permissionPage(
          "customers:update",
          <CustomerFormPage mode="edit" />,
        )}
      />
      <Route
        path="/products"
        element={permissionPage("products:view", <ProductsPage />)}
      />
      <Route
        path="/products/new"
        element={permissionPage("products:create", <ProductFormPage />)}
      />
      <Route
        path="/products/:id"
        element={permissionPage("products:view", <ProductDetailPage />)}
      />
      <Route
        path="/products/:id/edit"
        element={permissionPage(
          "products:update",
          <ProductFormPage mode="edit" />,
        )}
      />
      <Route
        path="/invoices"
        element={permissionPage("invoices:view", <InvoicesPage />)}
      />
      <Route
        path="/invoices/new"
        element={permissionPage("invoices:create", <CreateInvoicePage />)}
      />
      <Route
        path="/invoices/:id"
        element={permissionPage("invoices:view", <InvoiceDetailPage />)}
      />
      <Route
        path="/users"
        element={
          <AdminRoute>
            <UsersPage />
          </AdminRoute>
        }
      />
      <Route
        path="/users/new"
        element={permissionPage(
          ["iam_users:manage", "iam_permissions:manage"],
          <UserFormPage />,
        )}
      />
      <Route
        path="/users/:id"
        element={
          <AdminRoute>
            <UserDetailPage />
          </AdminRoute>
        }
      />
      <Route
        path="/users/:id/edit"
        element={permissionPage(
          ["iam_users:manage", "iam_permissions:manage"],
          <UserFormPage mode="edit" />,
        )}
      />
      <Route
        path="/roles"
        element={permissionPage("iam_roles:view", <RolesPage />)}
      />
      <Route
        path="/roles/new"
        element={permissionPage("iam_roles:manage", <RoleFormPage />)}
      />
      <Route
        path="/roles/:id"
        element={permissionPage("iam_roles:view", <RoleDetailPage />)}
      />
      <Route
        path="/roles/:id/edit"
        element={permissionPage(
          "iam_roles:manage",
          <RoleFormPage mode="edit" />,
        )}
      />
      <Route
        path="/permissions"
        element={permissionPage("iam_permissions:view", <PermissionsPage />)}
      />
      <Route
        path="/permissions/new"
        element={permissionPage(
          "iam_permissions:manage",
          <PermissionFormPage />,
        )}
      />
      <Route
        path="/permissions/:id"
        element={permissionPage(
          "iam_permissions:view",
          <PermissionDetailPage />,
        )}
      />
      <Route
        path="/permissions/:id/edit"
        element={permissionPage(
          "iam_permissions:manage",
          <PermissionFormPage mode="edit" />,
        )}
      />
      <Route path="/forbidden" element={protectedPage(<ForbiddenPage />)} />
      <Route path="*" element={protectedPage(<NotFoundPage />)} />
    </Routes>
  );
}

function ForbiddenPage() {
  return (
    <DashboardLayout>
      <div className="page-head">
        <h1>403 — Forbidden</h1>
      </div>
      <section className="surface full">
        <p>You do not have permission to open this page.</p>
      </section>
    </DashboardLayout>
  );
}

function NotFoundPage() {
  return (
    <DashboardLayout>
      <div className="not-found-context">Not Found</div>
      <div className="page-head">
        <div>
          <h1>Page Not Found</h1>
        </div>
      </div>
      <section className="surface full">
        <p className="muted">The page you requested does not exist.</p>
      </section>
    </DashboardLayout>
  );
}
