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
