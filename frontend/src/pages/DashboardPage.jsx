import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getDashboard } from "../api/dashboardApi";
import { Alert } from "../components/Alert";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { formatDate, rupiah } from "../utils/format";

const defaultData = {
  summary: {
    activeCustomers: 0,
    activeProducts: 0,
    lowStockProducts: 0,
    paidRevenue: 0,
  },
  monthlyRevenue: [],
  invoiceStatus: {
    DRAFT: 0,
    SUBMITTED: 0,
    PAID: 0,
    CANCELLED: 0,
  },
  recentInvoices: [],
  lowStockProductItems: [],
};

export function DashboardPage() {
  const [data, setData] = useState(defaultData);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    getDashboard()
      .then((res) => {
        if (active) setData({ ...defaultData, ...res.data.data });
      })
      .catch((error) =>
        setApiError(error.response?.data?.message || error.message),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const hasMonthlyRevenue = useMemo(
    () => data.monthlyRevenue.some((item) => Number(item.revenue) > 0),
    [data.monthlyRevenue],
  );
  const statusTotal = Object.values(data.invoiceStatus).reduce(
    (sum, value) => sum + Number(value || 0),
    0,
  );

  if (loading) {
    return (
      <DashboardLayout>
        <p className="muted">Loading dashboard...</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p>Monitor QA Lab customer, product, and invoice activity</p>
        </div>
      </div>

      <Alert msg={apiError} />

      <section className="dashboard-summary-grid">
        <SummaryCard
          label="Active Customers"
          value={data.summary.activeCustomers}
        />
        <SummaryCard
          label="Active Products"
          value={data.summary.activeProducts}
        />
        <SummaryCard
          label="Low Stock Products"
          value={data.summary.lowStockProducts}
        />
        <SummaryCard
          label="Paid Revenue"
          value={rupiah(data.summary.paidRevenue)}
        />
      </section>

      <section className="dashboard-analytics-grid">
        <div className="surface dashboard-chart-card">
          <div className="section-head">
            <div>
              <h2>Monthly Revenue</h2>
              <p>Paid invoice revenue by month</p>
            </div>
          </div>
          {hasMonthlyRevenue ? (
            <div className="dashboard-chart-wrap">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={data.monthlyRevenue}
                  margin={{ top: 16, right: 16, left: 4, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis
                    tickFormatter={(value) => compactRupiah(value)}
                    width={72}
                  />
                  <Tooltip formatter={(value) => rupiah(value)} />
                  <Bar dataKey="revenue" fill="var(--brand-blue-600)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="empty">No paid revenue available.</p>
          )}
        </div>

        <div className="surface dashboard-status-card">
          <h2>Invoice Status Overview</h2>
          <p className="muted">Total invoices by current status</p>
          <div className="invoice-status-list">
            {Object.entries(data.invoiceStatus).map(([status, value]) => (
              <div className="invoice-status-row" key={status}>
                <div>
                  <span className={`badge badge-${status.toLowerCase()}`}>
                    {status}
                  </span>
                </div>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <div className="invoice-status-total">
            <span>Total</span>
            <strong>{statusTotal}</strong>
          </div>
        </div>
      </section>

      <section className="dashboard-operational-grid">
        <div className="surface">
          <div className="section-head">
            <div>
              <h2>Recent Invoices</h2>
              <p>Latest invoice activity</p>
            </div>
            <Link className="primary" to="/invoices">
              See All
            </Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Invoice Number</th>
                  <th>Customer</th>
                  <th>Issue Date</th>
                  <th>Status</th>
                  <th>Grand Total</th>
                </tr>
              </thead>
              <tbody>
                {data.recentInvoices.length ? (
                  data.recentInvoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td>
                        <Link className="linked" to={`/invoices/${invoice.id}`}>
                          {invoice.invoiceNumber}
                        </Link>
                      </td>
                      <td>{invoice.customerNameSnapshot}</td>
                      <td>{formatDate(invoice.issueDate)}</td>
                      <td>
                        <span
                          className={`badge badge-${invoice.status.toLowerCase()}`}
                        >
                          {invoice.status}
                        </span>
                      </td>
                      <td>{rupiah(invoice.grandTotal)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="empty">
                      No recent invoices.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <LowStockProducts products={data.lowStockProductItems} compact />
      </section>
    </DashboardLayout>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="dashboard-summary-card">
      <span className="dashboard-summary-label">{label}</span>
      <div className="dashboard-summary-value">{value}</div>
    </div>
  );
}

function LowStockProducts({ products, compact = false }) {
  return (
    <section
      className={`surface dashboard-low-stock ${compact ? "dashboard-low-stock-compact" : ""}`}
    >
      <div className="section-head">
        <div>
          <h2>Low Stock Products</h2>
          <p>Products that need stock attention</p>
        </div>
      </div>
      <div className="low-stock-scroll">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Initial Stock</th>
              <th>Available Stock</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {products.length ? (
              products.map((product) => (
                <tr key={product.id}>
                  <td>
                    {product.productName} ({product.productCode})
                  </td>
                  <td>{product.initialStock}</td>
                  <td>{product.availableStock}</td>
                  <td>
                    <span
                      className={`badge ${product.status === "OUT OF STOCK" ? "badge-out-of-stock" : "badge-low-stock"}`}
                    >
                      {product.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="empty">
                  No low stock products.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function compactRupiah(value) {
  const number = Number(value || 0);
  if (number >= 1000000000) return `Rp${Math.round(number / 1000000000)}M`;
  if (number >= 1000000) return `Rp${Math.round(number / 1000000)}jt`;
  if (number >= 1000) return `Rp${Math.round(number / 1000)}rb`;
  return `Rp${number}`;
}
