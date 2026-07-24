export const notFoundMiddleware = (req, res) => res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan' });
