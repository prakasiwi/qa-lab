import { api } from './apiClient';

export const getProducts = (params = {}) => api.get('/products', { params });
export const getActiveProducts = () => getProducts({ status: 'active', limit: 100 });
export const getProductById = (id) => api.get(`/products/${id}`);
export const createProduct = (payload) => api.post('/products', payload);
export const updateProduct = (id, payload) => api.put(`/products/${id}`, payload);
export const deleteProduct = (id) => api.delete(`/products/${id}`);
