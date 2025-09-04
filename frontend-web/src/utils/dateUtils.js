/**
 * Format a date string into a readable format
 * @param {string} dateString - ISO date string
 * @param {boolean} includeTime - Whether to include time in the output
 * @returns {string} Formatted date string
 */
export const formatDate = (dateString, includeTime = false) => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };
    
    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.hour12 = true;
    }

    // Use selected app language if present
    let locale = 'en';
    try {
      const raw = localStorage.getItem('app_language') || 'en';
      const lang = raw === 'ka' ? 'kn' : raw;
      locale = lang;
    } catch {}
    
    return date.toLocaleDateString(locale, options);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
};

/**
 * Format a date into YYYY-MM-DD format (for date inputs)
 * @param {Date} date - Date object
 * @returns {string} Formatted date string (YYYY-MM-DD)
 */
export const formatDateForInput = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

// India-standard date: dd:mm:yyyy using Asia/Kolkata timezone
export const formatDateIndia = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const d = new Date(dateString);
    if (isNaN(d)) return 'Invalid date';
    // Render parts with timezone then reassemble to dd:mm:yyyy
    // Use selected app language for numerals/local words but Indian calendar order
    let locale = 'en-IN';
    try {
      const raw = localStorage.getItem('app_language') || 'en';
      const lang = raw === 'ka' ? 'kn' : raw;
      // Prefer regional Indian locale variant where possible
      locale = lang === 'en' ? 'en-IN' : `${lang}-IN`;
    } catch {}
    const parts = new Intl.DateTimeFormat(locale, {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).formatToParts(d);
    const dd = parts.find(p => p.type === 'day')?.value || '';
    const mm = parts.find(p => p.type === 'month')?.value || '';
    const yyyy = parts.find(p => p.type === 'year')?.value || '';
    return dd && mm && yyyy ? `${dd}:${mm}:${yyyy}` : 'Invalid date';
  } catch (e) {
    return 'Invalid date';
  }
};

// India-standard date-time with seconds: dd:mm:yyyy, hh:mm:ss am/pm (Asia/Kolkata)
export const formatDateTimeIndia = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const d = new Date(dateString);
    if (isNaN(d)) return 'Invalid date';
    // Build date part
    const datePart = formatDateIndia(dateString);
    // Build time part
    let locale = 'en-IN';
    try {
      const raw = localStorage.getItem('app_language') || 'en';
      const lang = raw === 'ka' ? 'kn' : raw;
      locale = lang === 'en' ? 'en-IN' : `${lang}-IN`;
    } catch {}
    const timePart = d.toLocaleTimeString(locale, {
      timeZone: 'Asia/Kolkata',
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    return `${datePart} ${timePart}`;
  } catch (e) {
    return 'Invalid date';
  }
};

// === New: Dynamic locale/timezone aware helpers driven by Regional settings ===
const getAppLocale = () => {
  try {
    const raw = localStorage.getItem('app_language') || 'en';
    return raw === 'ka' ? 'kn' : raw;
  } catch {
    return 'en';
  }
};

const getAppTimeZone = () => {
  try { return localStorage.getItem('app_timezone') || 'Asia/Kolkata'; } catch { return 'Asia/Kolkata'; }
};

const getAppDateFormat = () => {
  try { return localStorage.getItem('app_date_format') || 'dd-MM-yyyy'; } catch { return 'dd-MM-yyyy'; }
};

const getAppTimeFormat = () => {
  try { return localStorage.getItem('app_time_format') || 'hh:mm a'; } catch { return 'hh:mm a'; }
};

const pad2 = (v) => String(v).padStart(2, '0');

// Assemble a formatted string using simple pattern tokens and a specific timeZone
// Supported tokens: yyyy, MM, dd, MMM, MMMM, HH, hh, mm, ss, a
const formatByPattern = (date, pattern, timeZone) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
  const yyyy = map.year;
  const MM = map.month;
  const dd = map.day;
  const HH = map.hour;
  const mm = map.minute;
  const ss = map.second;
  const h24 = Number(HH);
  const h12 = h24 % 12 === 0 ? 12 : (h24 % 12);
  const ampm = h24 < 12 ? 'am' : 'pm';
  // Month names for MMM/MMMM
  const monthShort = new Intl.DateTimeFormat('en', { timeZone, month: 'short' }).format(date);
  const monthLong = new Intl.DateTimeFormat('en', { timeZone, month: 'long' }).format(date);
  return pattern
    .replace(/yyyy/g, yyyy)
    .replace(/MMMM/g, monthLong)
    .replace(/MMM/g, monthShort)
    .replace(/MM/g, MM)
    .replace(/dd/g, dd)
    .replace(/HH/g, pad2(HH))
    .replace(/hh/g, pad2(h12))
    .replace(/mm/g, mm)
    .replace(/ss/g, ss)
    .replace(/\ba\b/g, ampm);
};

/**
 * Format an ISO string using app_date_format + app_time_format and app_timezone
 * Examples: 'dd:mm:yyyy hh:mm:ss a' in Asia/Kolkata
 */
export const formatDateTime = (iso) => {
  if (!iso) return 'N/A';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Invalid date';
  const tz = getAppTimeZone();
  const df = getAppDateFormat();
  const tf = getAppTimeFormat();
  const pattern = tf ? `${df} ${tf}` : df;
  return formatByPattern(d, pattern, tz);
};

// New: date-only and time-only helpers honoring app settings
export const formatDateOnly = (iso) => {
  if (!iso) return 'N/A';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Invalid date';
  const tz = getAppTimeZone();
  const df = getAppDateFormat();
  return formatByPattern(d, df, tz);
};

export const formatTimeOnly = (iso) => {
  if (!iso) return 'N/A';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Invalid date';
  const tz = getAppTimeZone();
  const tf = getAppTimeFormat();
  return tf ? formatByPattern(d, tf, tz) : '';
};

/**
 * Currency formatter honoring current app language
 */
export const formatCurrency = (value, currency = 'INR', options = {}) => {
  try {
    const n = Number(value);
    if (!isFinite(n)) return '-';
    const locale = getAppLocale();
    const localeTag = locale === 'en' ? 'en-IN' : `${locale}-IN`;
    return new Intl.NumberFormat(localeTag, { style: 'currency', currency, ...options }).format(n);
  } catch (_) {
    return String(value);
  }
};

export const formatNumberCompact = (value, options = {}) => {
  try {
    const n = Number(value);
    if (!isFinite(n)) return '0';
    const locale = getAppLocale();
    const localeTag = locale === 'en' ? 'en-IN' : `${locale}-IN`;
    return new Intl.NumberFormat(localeTag, { notation: 'compact', maximumFractionDigits: 1, ...options }).format(n);
  } catch (_) {
    return String(value);
  }
};

export const formatNumber = (value, options = {}) => {
  try {
    const n = Number(value);
    if (!isFinite(n)) return '0';
    const locale = getAppLocale();
    const localeTag = locale === 'en' ? 'en-IN' : `${locale}-IN`;
    return new Intl.NumberFormat(localeTag, { ...options }).format(n);
  } catch (_) {
    return String(value);
  }
};
