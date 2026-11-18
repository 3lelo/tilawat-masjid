const ARABIC_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

/**
 * Format duration in seconds to "mm:ss" or "hh:mm:ss"
 */
export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hrs > 0) {
    return `${hrs}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

/**
 * Format file size in bytes to readable Arabic string
 */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 ميغابايت';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) {
    return `${mb.toFixed(1)} ميغابايت`;
  }
  const kb = bytes / 1024;
  return `${kb.toFixed(0)} كيلوبايت`;
}

/**
 * Format date (YYYY-MM-DD) into Arabic Month and Year, e.g. "فبراير 2025"
 * Used for grouping in year_month folders.
 */
export function getYearMonthSectionKey(dateString: string): { key: string; label: string; year: number; month: number } {
  try {
    const parts = dateString.split('-');
    if (parts.length >= 2) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const monthName = ARABIC_MONTHS[month - 1] || `شهر ${month}`;
      return {
        key: `${year}-${parts[1]}`,
        label: `${monthName} ${year}`,
        year,
        month,
      };
    }
  } catch {}

  return { key: 'other', label: 'تسجيلات أخرى', year: 0, month: 0 };
}

/**
 * Format full date string to friendly Arabic display
 */
export function formatArabicDate(dateString: string): string {
  try {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const day = parseInt(parts[2], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[0], 10);
      const monthName = ARABIC_MONTHS[month - 1] || parts[1];
      return `${day} ${monthName} ${year}`;
    }
  } catch {}
  return dateString;
}
