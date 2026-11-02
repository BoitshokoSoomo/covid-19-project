const express = require("express");
const data = require("../data/covid-19.json");
const Calc = require("./calc.js");

const app = express();
const port = Number(process.env.PORT || 4000);
const period = /^(\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})$/.exec(data.period || "");
const minDate = period ? period[1] : data.countries.flatMap((country) => country.data.map((row) => row.date)).sort()[0];
const maxDate = period ? period[2] : data.countries.flatMap((country) => country.data.map((row) => row.date)).sort().at(-1);
const countries = data.countries.map((country) => ({
  name: country.country,
  code: country.code,
  records: Calc.cleanRecords(country.data).records
}));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "covid-dashboard-api" });
});

app.get("/api/countries", (_req, res) => {
  res.json({
    source: data.source,
    period: { from: minDate, to: maxDate },
    countries: countries.map(({ name, code }) => ({ name, code }))
  });
});

app.get("/api/countries/:code", (req, res) => {
  const country = countries.find((entry) => entry.code.toLowerCase() === req.params.code.toLowerCase());
  if (!country) return res.status(404).json({ error: "Country not found." });

  const from = req.query.from || minDate;
  const to = req.query.to || maxDate;
  if (Number.isNaN(Calc.toTime(from)) || Number.isNaN(Calc.toTime(to)) || from > to) {
    return res.status(400).json({ error: "Provide a valid date range with start on or before end." });
  }
  if (from < minDate || to > maxDate) {
    return res.status(400).json({ error: `Dates must be between ${minDate} and ${maxDate}.` });
  }

  const timeline = Calc.dateRange(from, to);
  const reports = country.records.filter((record) => record.date >= from && record.date <= to);
  const latest = reports.at(-1) || null;
  const daily = Object.fromEntries(["confirmed", "deaths", "recovered"].map((key) => [
    key,
    Calc.dailyNew(country.records, timeline, key)
  ]));

  return res.json({
    country: { name: country.name, code: country.code },
    range: { from, to },
    timeline,
    reports,
    latest,
    metrics: latest ? {
      confirmed: latest.confirmed,
      deaths: latest.deaths,
      recovered: latest.recovered,
      active: Calc.activeCases(latest)
    } : null,
    trend: Object.fromEntries(["confirmed", "deaths", "recovered"].map((key) => [
      key,
      Calc.alignToTimeline(reports, timeline, key)
    ])),
    daily,
    peakDailyCases: Calc.peakEstimate(daily.confirmed),
    reportGaps: Calc.gapRange(country.records)
  });
});

app.use("/api", (_req, res) => res.status(404).json({ error: "API route not found." }));

app.listen(port, () => {
  console.log(`COVID dashboard API listening on http://localhost:${port}`);
});
