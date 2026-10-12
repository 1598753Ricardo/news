export function formatDate(value: string, includeTime = false): string {
  if (!value) return "时间未提供";
  const day = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return value;
  const [year, month, date] = day.split("-");
  const simple = `${year}年${Number(month)}月${Number(date)}日`;
  if (!includeTime || value.length <= 10) return simple;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return simple;
  const time = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parsed);
  return `${simple} ${time}`;
}
