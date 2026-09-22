/**
 * Utility functions for exporting events and tickets to Google and Apple Calendars.
 */

// Mapping of French month names to 0-indexed month numbers
const MONTHS_MAP: Record<string, number> = {
  janvier: 0,
  fevrier: 1,
  mars: 2,
  avril: 3,
  mai: 4,
  juin: 5,
  juillet: 6,
  aout: 7,
  septembre: 8,
  octobre: 9,
  novembre: 10,
  decembre: 11
};

/**
 * Parses a French date string like "Dimanche 26 Juillet 2026" or "Samedi 1 Août 2026"
 * and a time string like "15:30" into a standard JavaScript Date object.
 */
export const parseEventDate = (dateStr: string, timeStr: string): Date => {
  let year = 2026;
  let month = 6; // Default to July
  let day = 26;

  // Extract day number, month name, and year using Regex
  const match = dateStr.match(/(\d+)\s+(\S+)\s+(\d{4})/i);
  if (match) {
    day = parseInt(match[1], 10);
    const rawMonth = match[2].toLowerCase();
    
    // Normalize to remove French accents (e.g. "Août" -> "aout", "Février" -> "fevrier")
    const normalizedMonth = rawMonth
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[ûù]/g, 'u')
      .replace(/[éèêë]/g, 'e')
      .replace(/[àâä]/g, 'a')
      .replace(/[îï]/g, 'i')
      .replace(/[ôö]/g, 'o');

    if (MONTHS_MAP[normalizedMonth] !== undefined) {
      month = MONTHS_MAP[normalizedMonth];
    }
    year = parseInt(match[3], 10);
  }

  // Parse time (e.g. "15:30" or "18h00")
  let hours = 15;
  let minutes = 0;
  
  const cleanTime = timeStr.replace('h', ':');
  const timeParts = cleanTime.split(':');
  if (timeParts.length >= 2) {
    hours = parseInt(timeParts[0], 10) || 15;
    minutes = parseInt(timeParts[1], 10) || 0;
  } else if (timeParts.length === 1) {
    hours = parseInt(timeParts[0], 10) || 15;
  }

  return new Date(year, month, day, hours, minutes);
};

/**
 * Helper to format a Date as YYYYMMDDTHHmmSS for floating/local timezone.
 */
const formatLocalCalendarDate = (date: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const YYYY = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const DD = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${YYYY}${MM}${DD}T${hh}${mm}${ss}`;
};

/**
 * Generates a Google Calendar share link.
 */
export const getGoogleCalendarUrl = (
  title: string,
  description: string,
  location: string,
  startDate: Date,
  durationHours = 3
): string => {
  const endDate = new Date(startDate.getTime() + durationHours * 60 * 60 * 1000);
  const dates = `${formatLocalCalendarDate(startDate)}/${formatLocalCalendarDate(endDate)}`;
  
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    title
  )}&dates=${dates}&details=${encodeURIComponent(description)}&location=${encodeURIComponent(
    location
  )}`;
};

/**
 * Generates and triggers downloading an Apple Calendar/iCal .ics file.
 */
export const downloadIcal = (
  title: string,
  description: string,
  location: string,
  startDate: Date,
  uid: string,
  durationHours = 3
): void => {
  const endDate = new Date(startDate.getTime() + durationHours * 60 * 60 * 1000);
  const pad = (n: number) => n.toString().padStart(2, '0');
  
  const formatDate = (date: Date) => {
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  };

  const cleanText = (str: string) => {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/,/g, '\\,')
      .replace(/;/g, '\\;')
      .replace(/\n/g, '\\n');
  };

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//IwacuTix Burundi//Calendar Export//FR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}-${startDate.getTime()}@iwacutix.bi`,
    `DTSTAMP:${formatDate(new Date())}`,
    `DTSTART:${formatDate(startDate)}`,
    `DTEND:${formatDate(endDate)}`,
    `SUMMARY:${cleanText(title)}`,
    `DESCRIPTION:${cleanText(description)}`,
    `LOCATION:${cleanText(location)}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ];

  const icsContent = icsLines.join('\r\n');
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  
  // Format filename nicely
  const safeTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .slice(0, 30);
  link.setAttribute('download', `iwacutix-event-${safeTitle}.ics`);
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
