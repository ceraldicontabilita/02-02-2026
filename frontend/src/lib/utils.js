import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Converte una data ISO (YYYY-MM-DD) in formato italiano (gg/mm/aaaa)
 */
export function formatDateIT(dateStr) {
  if (!dateStr) return "-";
  try {
    // Se contiene T, prendi solo la parte data
    const datePart = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
    const parts = datePart.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

/**
 * Converte una data italiana (gg/mm/aaaa) in formato ISO (YYYY-MM-DD)
 */
export function parseDateIT(dateStr) {
  if (!dateStr) return null;
  try {
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

/**
 * Formatta un importo in euro
 */
export function formatEuro(amount) {
  if (amount === null || amount === undefined) return "€ 0,00";
  return `€ ${parseFloat(amount).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Formatta data e ora in italiano
 */
export function formatDateTimeIT(dateStr) {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
}
