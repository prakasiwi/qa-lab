export const ok = (res, message, data = null, status = 200) => res.status(status).json({ success: true, message, data });
