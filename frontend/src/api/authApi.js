import { api } from './apiClient';

export const login = (payload) => api.post('/auth/login', payload);
