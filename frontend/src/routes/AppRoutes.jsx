import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { DashboardPage } from '../pages/DashboardPage';
import { LoginPage } from '../pages/LoginPage';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { CustomerDetailPage } from '../pages/customers/CustomerDetailPage';
import { CustomerFormPage } from '../pages/customers/CustomerFormPage';
import CustomersPage from '../pages/customers/CustomersPage';
import CreateInvoicePage from '../pages/invoices/CreateInvoicePage';
import { InvoiceDetailPage } from '../pages/invoices/InvoiceDetailPage';
import InvoicesPage from '../pages/invoices/InvoicesPage';
import { ProductDetailPage } from '../pages/products/ProductDetailPage';
import { ProductFormPage } from '../pages/products/ProductFormPage';
import ProductsPage from '../pages/products/ProductsPage';

const protectedPage = (page) => <ProtectedRoute>{page}</ProtectedRoute>;

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={protectedPage(<DashboardPage />)} />
        <Route path="/dashboard" element={protectedPage(<DashboardPage />)} />
        <Route path="/customers" element={protectedPage(<CustomersPage />)} />
        <Route path="/customers/new" element={protectedPage(<CustomerFormPage />)} />
        <Route path="/customers/:id" element={protectedPage(<CustomerDetailPage />)} />
        <Route path="/customers/:id/edit" element={protectedPage(<CustomerFormPage mode="edit" />)} />
        <Route path="/products" element={protectedPage(<ProductsPage />)} />
        <Route path="/products/new" element={protectedPage(<ProductFormPage />)} />
        <Route path="/products/:id" element={protectedPage(<ProductDetailPage />)} />
        <Route path="/products/:id/edit" element={protectedPage(<ProductFormPage mode="edit" />)} />
        <Route path="/invoices" element={protectedPage(<InvoicesPage />)} />
        <Route path="/invoices/new" element={protectedPage(<CreateInvoicePage />)} />
        <Route path="/invoices/:id" element={protectedPage(<InvoiceDetailPage />)} />
        <Route path="*" element={protectedPage(<NotFoundPage />)} />
      </Routes>
    </BrowserRouter>
  );
}

function NotFoundPage() {
  return (
    <DashboardLayout>
      <div className="breadcrumb">Not Found</div>
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
