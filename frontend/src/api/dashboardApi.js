import { api } from './apiClient';

export const getDashboard = () => api.get('/dashboard');
export const getDashboardSummary = () => api.get('/dashboard/summary');
