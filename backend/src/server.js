const express = require("express");
const data = require("../data/covid-19.json");

const app = express();
const port = Number(process.env.PORT || 4000);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "covid-dashboard-api" });
});

app.get("/api/countries", (_req, res) => {
  res.json({
    source: data.source,
    period: data.period,
    countries: data.countries.map(({ country, code }) => ({ name: country, code }))
  });
});

app.get("/api/countries/:code", (req, res) => {
  const country = data.countries.find((item) => item.code.toLowerCase() === req.params.code.toLowerCase());
  if (!country) return res.status(404).json({ error: "Country not found." });
  res.json({ country: { name: country.country, code: country.code }, records: country.data });
});

app.use("/api", (_req, res) => res.status(404).json({ error: "API route not found." }));

app.listen(port, () => {
  console.log(`COVID dashboard API listening on http://localhost:${port}`);
});
