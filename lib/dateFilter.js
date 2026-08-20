function startOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfMonth(d) {
  const date = new Date(d.getFullYear(), d.getMonth(), 1);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Resolves the `period`/`from`/`to` search params (set by DateRangeFilter)
 * into an actual { start, end } Date range, or null for "all time".
 */
export function getDateRange(searchParams) {
  const period = searchParams?.period || "all";
  const now = new Date();

  switch (period) {
    case "week":
      return { start: startOfWeek(now), end: now };
    case "month":
      return { start: startOfMonth(now), end: now };
    case "30d": {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      return { start, end: now };
    }
    case "custom": {
      const start = searchParams?.from ? new Date(searchParams.from) : null;
      const end = searchParams?.to ? new Date(searchParams.to) : now;
      if (!start) return null;
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case "all":
    default:
      return null;
  }
}

/**
 * Filters an array of records by a date field name, given the resolved
 * range (or returns the array unchanged if range is null — "all time").
 */
export function filterByDateRange(records, range, dateField) {
  if (!range) return records;
  return records.filter((r) => {
    const value = r[dateField];
    if (!value) return false;
    const d = new Date(value);
    return d >= range.start && d <= range.end;
  });
}
