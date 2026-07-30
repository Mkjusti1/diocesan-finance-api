import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs) { return twMerge(clsx(inputs)); }
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);
}
export function formatDate(dateString) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Add this to the bottom of client/src/lib/utils.js
export function sortParishesWithCathedralFirst(parishes) {
  return [...parishes].sort((a, b) => {
    if (a.name === 'Aguleri: St. Joseph') return -1;
    if (b.name === 'Aguleri: St. Joseph') return 1;
    return a.name.localeCompare(b.name);
  });
}