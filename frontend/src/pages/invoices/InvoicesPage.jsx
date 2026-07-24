import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getInvoices, submitInvoice } from '../../api/invoiceApi';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { rupiah } from '../../utils/format';

function InvoicesPage() {
  const [rows, setRows] = useState([]);
  const load = () => getInvoices().then((res) => setRows(res.data.data));

  useEffect(() => {
    getInvoices().then((res) => setRows(res.data.data));
  }, []);

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
      <div className="table-wrap">
        <table>
          <thead><tr><th>No</th><th>Customer</th><th>Status</th><th>Total</th><th>Action</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td><Link className="linked invoice-link" to={`/invoices/${row.id}`}>
                  {row.invoiceNumber}
                </Link></td>
                <td>{row.customerNameSnapshot || row.customer?.customerName}</td>
                <td><span className={`badge badge-${row.status.toLowerCase()}`}>{row.status}</span></td>
                <td>{rupiah(row.grandTotal)}</td>
                <td><div className="button-group">{row.status === 'DRAFT' && <button className="primary" onClick={() => submit(row.id)}>Submit</button>}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}

export { InvoicesPage };
export default InvoicesPage;
