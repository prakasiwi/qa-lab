import { api } from './apiClient';

export const getInvoices = () => api.get('/invoices');
export const getInvoice = (id) => api.get(`/invoices/${id}`);
export const getInvoiceById = getInvoice;
export const createInvoice = (payload) => api.post('/invoices', payload);
export const submitInvoice = (id) => api.post(`/invoices/${id}/pay`);
export const payInvoice = (id) => api.post(`/invoices/${id}/pay`);
export const cancelInvoice = (id) => api.post(`/invoices/${id}/cancel`);
