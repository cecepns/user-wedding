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

// Date formatter for Indonesian locale
export const formatDate = (date) => {
  if (!date) return '-';
  
  return new Date(date).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Date and time formatter
export const formatDateTime = (date) => {
  if (!date) return '-';
  
  return new Date(date).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}; 