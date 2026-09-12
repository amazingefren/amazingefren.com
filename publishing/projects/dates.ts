export const defaultPublicationTimezone = 'America/Denver';

export function publicationTimezone(timezone?: string) {
  if (timezone) {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: timezone });
      return timezone;
    } catch {}
  }
  return defaultPublicationTimezone;
}

export function formatPublicationDate(instant: string, timezone?: string) {
  const date = new Date(instant);
  return Number.isFinite(date.valueOf())
    ? new Intl.DateTimeFormat('en-US', {
        timeZone: publicationTimezone(timezone),
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      }).format(date)
    : 'Date unavailable';
}
