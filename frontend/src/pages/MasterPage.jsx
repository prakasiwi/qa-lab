import { useEffect, useState } from 'react';
import { Alert } from '../components/Alert';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { createCustomer, deleteCustomer, getCustomers, updateCustomer } from '../api/customerApi';
import { createProduct, deleteProduct, getProducts, updateProduct } from '../api/productApi';

export function MasterPage({ type }) {
  const isCustomer = type === 'customers';
  const empty = isCustomer
    ? { customerCode: '', customerName: '', email: '', phone: '', address: '' }
    : { productCode: '', productName: '', price: 0, initialStock: 0 };
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState('');

  const load = () => {
    const request = isCustomer ? getCustomers() : getProducts();
    return request.then((res) => setRows(res.data.data.items));
  };

  useEffect(() => {
    const request = type === 'customers' ? getCustomers() : getProducts();
    request.then((res) => setRows(res.data.data.items));
  }, [type]);

  async function save(e) {
    e.preventDefault();
    setMsg('');
    try {
      if (editing) {
        if (isCustomer) await updateCustomer(editing, form);
        else await updateProduct(editing, form);
      } else if (isCustomer) {
        await createCustomer(form);
      } else {
        await createProduct(form);
      }
      setForm(empty);
      setEditing(null);
      load();
    } catch (error) {
      setMsg(error.response?.data?.message || error.message);
    }
  }

  function edit(row) {
    setEditing(row.id);
    setForm(isCustomer
      ? { customerCode: row.customerCode, customerName: row.customerName, email: row.email || '', phone: row.phone || '', address: row.address || '' }
      : { productCode: row.productCode, productName: row.productName, price: Number(row.price), initialStock: row.initialStock });
  }

  async function del(id) {
    if (!confirm('Hapus data ini?')) return;
    if (isCustomer) await deleteCustomer(id);
    else await deleteProduct(id);
    load();
  }

  return (
    <DashboardLayout>
      <h1>{isCustomer ? 'Customers' : 'Products'}</h1>
      <Alert msg={msg} />
      <form className="card form" onSubmit={save}>
        {Object.keys(empty).map((key) => (
          <input
            key={key}
            type={key === 'price' || key === 'initialStock' ? 'number' : 'text'}
            value={form[key]}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            placeholder={key}
            aria-label={key}
          />
        ))}
        <div className="button-group">
          <button className="primary">{editing ? 'Update' : 'Create'}</button>
          {editing && <button type="button" className="neutral" onClick={() => { setEditing(null); setForm(empty); }}>Cancel</button>}
        </div>
      </form>
      <table>
        <thead>
          <tr>{Object.keys(empty).slice(0, 3).map((key) => <th key={key}>{key}</th>)}<th>active</th><th>action</th></tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {Object.keys(empty).slice(0, 3).map((key) => <td key={key}>{String(row[key] ?? '')}</td>)}
              <td>{row.isActive ? 'Yes' : 'No'}</td>
              <td><div className="button-group"><button className="btn-edit" onClick={() => edit(row)}>Edit</button><button className="danger" onClick={() => del(row.id)}>Delete</button></div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </DashboardLayout>
  );
}
