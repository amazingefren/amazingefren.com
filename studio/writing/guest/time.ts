export function publicationTime(
  value: string | undefined,
  current: string,
): string | null {
  if (value === undefined) return current;
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    )
  )
    return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) &&
    date.getTime() <= Date.parse(current)
    ? date.toISOString()
    : null;
}

export function publicationTimezone(value: string | undefined): string | null {
  const timezone = value ?? 'America/Denver';
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return timezone;
  } catch {
    return null;
  }
}
