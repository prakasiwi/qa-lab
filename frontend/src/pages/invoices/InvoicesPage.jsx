import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getInvoices, submitInvoice } from '../../api/invoiceApi';
import { Alert } from '../../components/Alert';
import { Pagination } from '../../components/Pagination';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { rupiah } from '../../utils/format';

function InvoicesPage() {
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');

  function load(page = pagination.page, limit = pagination.limit) {
    setLoading(true);
    setApiError('');
    return getInvoices({ page, limit })
      .then((res) => {
        const data = res.data.data;
        setRows(data.items);
        setPagination({ page: data.page, limit: data.limit, total: data.total });
      })
      .catch((error) => setApiError(error.response?.data?.message || error.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load(pagination.page, pagination.limit);
  }, [pagination.page, pagination.limit]);

  function changeLimit(limit) {
    setPagination((current) => ({ ...current, page: 1, limit }));
  }

  async function submit(id) {
    await submitInvoice(id);
    load();
  }

  return (
    <DashboardLayout>
      <div className="page-head">
        <div>
          <h1>Invoices</h1>
        </div>
        <Link className="primary" to="/invoices/new">Create Invoice</Link>
      </div>
      <Alert msg={apiError} />
      {loading ? (
        <p className="muted">Loading invoices...</p>
      ) : (
        <div className="table-card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>No</th><th>Customer</th><th>Status</th><th>Total</th><th>Action</th></tr></thead>
              <tbody>
                {rows.length ? rows.map((row) => (
                  <tr key={row.id}>
                    <td><Link className="linked invoice-link" to={`/invoices/${row.id}`}>
                      {row.invoiceNumber}
                    </Link></td>
                    <td>{row.customerNameSnapshot || row.customer?.customerName}</td>
                    <td><span className={`badge badge-${row.status.toLowerCase()}`}>{row.status}</span></td>
                    <td>{rupiah(row.grandTotal)}</td>
                    <td><div className="button-group">{row.status === 'DRAFT' && <button className="primary" onClick={() => submit(row.id)}>Submit</button>}</div></td>
                  </tr>
                )) : (
                  <tr>
                    <td className="empty-table-cell" colSpan={5}>No invoices available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            page={pagination.page}
            limit={pagination.limit}
            total={pagination.total}
            onPageChange={(page) => setPagination((current) => ({ ...current, page }))}
            onLimitChange={changeLimit}
          />
        </div>
      )}
    </DashboardLayout>
  );
}

export { InvoicesPage };
export default InvoicesPage;
