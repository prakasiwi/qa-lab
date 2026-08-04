import { api } from './apiClient';

export const getCustomers = (params = {}) => api.get('/customers', { params });
export const getActiveCustomers = () => getCustomers({ status: 'active', limit: 100 });
export const getInvoiceCustomerOptions = () => getCustomers({ limit: 100 });
export const getCustomerById = (id) => api.get(`/customers/${id}`);
export const createCustomer = (payload) => api.post('/customers', payload);
export const updateCustomer = (id, payload) => api.put(`/customers/${id}`, payload);
export const deleteCustomer = (id) => api.delete(`/customers/${id}`);
