export const countWords = (value: string) =>
  value.trim() ? value.trim().split(/\s+/).length : 0;
export const manuscriptOutline = (value: string) =>
  value
    .split('\n')
    .map((text, line) => ({ text, line }))
    .filter((item) => /^#{1,6}\s+/.test(item.text))
    .map((item) => ({
      line: item.line,
      depth: item.text.match(/^#+/)![0].length,
      title: item.text.replace(/^#+\s+/, ''),
    }));
export function markdownInsertion(
  command:
    | 'bold'
    | 'italic'
    | 'heading'
    | 'link'
    | 'code'
    | 'list'
    | 'quote'
    | 'table',
  selected: string,
) {
  const text =
    selected ||
    (command === 'heading'
      ? 'Heading'
      : command === 'link'
        ? 'Link text'
        : 'Text');
  if (command === 'bold') return `**${text}**`;
  if (command === 'italic') return `*${text}*`;
  if (command === 'heading') return `## ${text}`;
  if (command === 'link') return `[${text}](https://)`;
  if (command === 'code') return `\`${text}\``;
  if (command === 'list') return `- ${text}`;
  if (command === 'quote') return `> ${text}`;
  return `| Column | Value |\n| --- | --- |\n| ${text} | |`;
}

export function publicationInstant(value: string, timezone: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const wallClock = new Date(0);
  wallClock.setUTCFullYear(year, month - 1, day);
  wallClock.setUTCHours(hour, minute, 0, 0);
  if (
    wallClock.getUTCFullYear() !== year ||
    wallClock.getUTCMonth() !== month - 1 ||
    wallClock.getUTCDate() !== day ||
    hour > 23 ||
    minute > 59
  )
    return null;
  try {
    const offsets = new Set<number>();
    for (let delta = -36; delta <= 36; delta++) {
      const instant = new Date(wallClock.getTime() + delta * 60 * 60_000);
      offsets.add(timezoneOffset(instant, timezone));
    }
    const candidates = [...offsets]
      .map((offset) => new Date(wallClock.getTime() - offset * 60_000))
      .filter((instant) =>
        sameWallClock(instant, timezone, { year, month, day, hour, minute }),
      );
    return candidates.length === 1 ? candidates[0].toISOString() : null;
  } catch {
    return null;
  }
}

function timezoneOffset(instant: Date, timezone: string) {
  const name = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'longOffset',
  })
    .formatToParts(instant)
    .find((part) => part.type === 'timeZoneName')?.value;
  if (name === 'GMT' || name === 'UTC') return 0;
  const match = /^GMT([+-])(\d{2}):(\d{2})$/.exec(name ?? '');
  if (!match) throw new Error('Timezone offset is unavailable.');
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return match[1] === '+' ? minutes : -minutes;
}

function sameWallClock(
  instant: Date,
  timezone: string,
  expected: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
  },
) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return (
    read('year') === expected.year &&
    read('month') === expected.month &&
    read('day') === expected.day &&
    read('hour') === expected.hour &&
    read('minute') === expected.minute
  );
}
