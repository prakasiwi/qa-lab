export const today = () => new Date().toISOString().slice(0, 10);

export const rupiah = (value) => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
}).format(Number(value || 0));

export function formatDate(value) {
  if (!value) return '-';

  const normalized = String(value).slice(0, 10);
  const [year, month, day] = normalized.split('-');

  if (!year || !month || !day) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(Number(year), Number(month) - 1, Number(day)));
}
