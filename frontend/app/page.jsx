"use client";

import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const colors = { confirmed: "#1f5fa8", deaths: "#b3261e", recovered: "#1b8a6b", grid: "#e3e7ea", muted: "#5b6770" };
const number = new Intl.NumberFormat("en-GB");
const shortDate = (date) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export default function DashboardSetup() {
  const [countries, setCountries] = useState([]);
  const [countryCode, setCountryCode] = useState("");
  const [records, setRecords] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/countries")
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not load countries.");
        return result;
      })
      .then((result) => {
        setCountries(result.countries);
        setCountryCode(result.countries[0]?.code || "");
      })
      .catch((problem) => setError(problem.message));
  }, []);

  useEffect(() => {
    if (!countryCode) return;
    fetch(`/api/countries/${encodeURIComponent(countryCode)}`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not load country data.");
        return result;
      })
      .then((result) => {
        console.log("Loaded COVID-19 reports:", result);
        setRecords(result.records);
        setError("");
      })
      .catch((problem) => setError(problem.message));
  }, [countryCode]);

  const selectedCountry = countries.find((item) => item.code === countryCode);
  const chartData = {
    labels: records.map((record) => record.date),
    datasets: [
      { label: "Confirmed", data: records.map((record) => record.confirmed), borderColor: colors.confirmed, backgroundColor: colors.confirmed, borderWidth: 2.5, pointRadius: 3 },
      { label: "Deaths", data: records.map((record) => record.deaths), borderColor: colors.deaths, backgroundColor: colors.deaths, borderWidth: 2.5, pointRadius: 3 },
      { label: "Recovered", data: records.map((record) => record.recovered), borderColor: colors.recovered, backgroundColor: colors.recovered, borderWidth: 2.5, pointRadius: 3 }
    ]
  };
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { mode: "index", intersect: false },
    scales: {
      x: { grid: { display: false }, ticks: { color: colors.muted, maxTicksLimit: 10, maxRotation: 0, callback(value) { return shortDate(this.getLabelForValue(value)); } } },
      y: { beginAtZero: true, grid: { color: colors.grid }, ticks: { color: colors.muted, callback: (value) => number.format(value) } }
    },
    plugins: {
      legend: { position: "top", align: "start" },
      tooltip: { callbacks: { title: (items) => items.length ? shortDate(items[0].label) : "", label: (context) => `${context.dataset.label}: ${number.format(context.raw)}` } }
    }
  };

  return (
    <main className="setup-page">
      <h1>COVID-19 early outbreak</h1>
      <p>February–March 2020 reported data</p>
      <label htmlFor="country">Country</label>
      <select id="country" value={countryCode} onChange={(event) => setCountryCode(event.target.value)} disabled={!countries.length}>
        {countries.map((country) => <option value={country.code} key={country.code}>{country.name}</option>)}
      </select>
      {error && <p role="alert">{error}</p>}
      {selectedCountry && <p>{records.length} reports loaded for {selectedCountry.name}.</p>}
      <section className="trend-section" aria-label="Cumulative case trend">
        <h2>Cumulative cases, deaths and recoveries</h2>
        <div className="chart-wrap"><Line data={chartData} options={chartOptions} /></div>
        <p className="chart-note">Each point is a reported cumulative total. Lines connect reports; they do not represent daily observations.</p>
      </section>
    </main>
  );
}
