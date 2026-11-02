/*
 * calc.js
 * Pure calculation helpers. No DOM access, so the same file runs in the
 * browser (window.Calc) and in Node (tests/calc.test.js).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Calc = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  const DAY_MS = 86400000;

  // Dates are handled as UTC midnight, so daylight saving never shifts a day.
  function toTime(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso));
    if (!m) return NaN;
    const t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    return toISO(t) === iso ? t : NaN; // rejects dates such as 2020-02-31
  }

  function toISO(time) {
    return new Date(time).toISOString().slice(0, 10);
  }

  function daysBetween(a, b) {
    return Math.round((toTime(b) - toTime(a)) / DAY_MS);
  }

  function addDays(iso, n) {
    return toISO(toTime(iso) + n * DAY_MS);
  }

  function dateRange(start, end) {
    const out = [];
    const last = toTime(end);
    for (let t = toTime(start); t <= last; t += DAY_MS) out.push(toISO(t));
    return out;
  }

  function numberOrNull(v) {
    return typeof v === 'number' && isFinite(v) && v >= 0 ? v : null;
  }

  /**
   * Validates and sorts the raw rows of one country.
   * Rows with a bad date or no confirmed count are skipped.
   * A missing deaths or recovered value becomes null, not zero.
   * If a date appears twice, the last row wins.
   */
  function cleanRecords(rows) {
    const byDate = new Map();
    const skipped = [];
    (Array.isArray(rows) ? rows : []).forEach(function (row) {
      const ok = row && !isNaN(toTime(row.date)) && numberOrNull(row.confirmed) !== null;
      if (!ok) {
        skipped.push(row);
        return;
      }
      byDate.set(row.date, {
        date: row.date,
        confirmed: row.confirmed,
        deaths: numberOrNull(row.deaths),
        recovered: numberOrNull(row.recovered)
      });
    });
    const records = Array.from(byDate.values()).sort(function (a, b) {
      return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
    });
    return { records: records, skipped: skipped };
  }

  // Active cases = confirmed - deaths - recovered.
  function activeCases(rec) {
    if (!rec || rec.deaths === null || rec.recovered === null) return null;
    return rec.confirmed - rec.deaths - rec.recovered;
  }

  // Share of confirmed cases, in percent. Returns null when it has no meaning.
  function percentOfConfirmed(rec, key) {
    if (!rec || rec.confirmed <= 0 || rec[key] === null) return null;
    return (rec[key] / rec.confirmed) * 100;
  }

  // One value per timeline day. A day without a report gives null.
  function alignToTimeline(records, timeline, key) {
    const map = new Map(records.map(function (r) { return [r.date, r[key]]; }));
    return timeline.map(function (d) { return map.has(d) ? map.get(d) : null; });
  }

  /**
   * Daily new cases from cumulative totals.
   *
   * The file holds a report every few days, not every day. For two reports
   * on dates d1 and d2 the total new cases is value(d2) - value(d1). That
   * total is shared evenly over the days in (d1, d2], so every day gets
   * total / days. The first report has no earlier report, so it gets no bar.
   *
   * Returns one entry per timeline day, or null where no estimate exists.
   * An entry is { value, total, from, to, span }.
   */
  function dailyNew(records, timeline, key) {
    const byDay = new Map();
    for (let i = 1; i < records.length; i++) {
      const prev = records[i - 1];
      const cur = records[i];
      const span = daysBetween(prev.date, cur.date);
      if (span <= 0 || prev[key] === null || cur[key] === null) continue;
      const total = cur[key] - prev[key];
      for (let k = 1; k <= span; k++) {
        byDay.set(addDays(prev.date, k), {
          value: total / span,
          total: total,
          from: prev.date,
          to: cur.date,
          span: span
        });
      }
    }
    return timeline.map(function (d) { return byDay.get(d) || null; });
  }

  // The estimate with the highest daily value, or null.
  function peakEstimate(estimates) {
    let best = null;
    estimates.forEach(function (e) {
      if (e && (best === null || e.value > best.value)) best = e;
    });
    return best;
  }

  // Smallest and largest gap, in days, between two reports.
  function gapRange(records) {
    if (records.length < 2) return null;
    let min = Infinity;
    let max = 0;
    for (let i = 1; i < records.length; i++) {
      const g = daysBetween(records[i - 1].date, records[i].date);
      if (g < min) min = g;
      if (g > max) max = g;
    }
    return { min: min, max: max };
  }

  return {
    toTime: toTime,
    toISO: toISO,
    daysBetween: daysBetween,
    addDays: addDays,
    dateRange: dateRange,
    cleanRecords: cleanRecords,
    activeCases: activeCases,
    percentOfConfirmed: percentOfConfirmed,
    alignToTimeline: alignToTimeline,
    dailyNew: dailyNew,
    peakEstimate: peakEstimate,
    gapRange: gapRange
  };
});
