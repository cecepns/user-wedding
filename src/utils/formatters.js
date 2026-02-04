// Currency formatter for Indonesian Rupiah
export const formatRupiah = (amount) => {
  if (!amount && amount !== 0) return 'Rp 0';
  
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numericAmount)) return 'Rp 0';
  
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numericAmount);
};

// Parse date-only string (YYYY-MM-DD) as local calendar date to avoid timezone shift (exported for calendar key grouping)
export const toLocalDate = (date) => {
  if (!date) return null;
  const s = typeof date === 'string' ? date.trim() : String(date);
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (match) {
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10) - 1;
    const d = parseInt(match[3], 10);
    return new Date(y, m, d);
  }
  return new Date(date);
};

// Return YYYY-MM-DD for the intended calendar day (for API payloads; avoids timezone shift on save)
export const toDateOnlyString = (date) => {
  if (!date) return '';
  const d = toLocalDate(date);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Date formatter for Indonesian locale (date-only strings shown as intended calendar day)
export const formatDate = (date) => {
  if (!date) return '-';
  const d = toLocalDate(date);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Date and time formatter (date-only strings shown as intended calendar day)
export const formatDateTime = (date) => {
  if (!date) return '-';
  const d = toLocalDate(date);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}; 