"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, LogarithmicScale, PointElement, LineElement, BarElement, Tooltip, Legend);

const WHO_DATE = "2020-03-11";
const colors = { confirmed: "#1f5fa8", deaths: "#b3261e", recovered: "#1b8a6b", muted: "#5b6770", grid: "#e3e7ea" };
const metricOptions = {
  confirmed: { title: "New cases per day", unit: "new cases" },
  deaths: { title: "New deaths per day", unit: "new deaths" },
  recovered: { title: "New recoveries per day", unit: "new recoveries" }
};
const number = new Intl.NumberFormat("en-GB");
const decimal = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat("en-GB", { notation: "compact", maximumFractionDigits: 1 });
const longDate = (date) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const shortDate = (date) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

const whoMarker = {
  id: "whoMarker",
  afterDatasetsDraw(chart) {
    const index = chart.data.labels?.indexOf(WHO_DATE);
    if (index == null || index < 0) return;
    const { ctx, chartArea, scales } = chart;
    const x = scales.x.getPixelForValue(index);
    ctx.save();
    ctx.strokeStyle = colors.muted;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x, chartArea.top);
    ctx.lineTo(x, chartArea.bottom);
    ctx.stroke();
    ctx.restore();
  }
};

function baseOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { mode: "index", intersect: false },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          autoSkip: true,
          maxTicksLimit: 10,
          maxRotation: 0,
          color: colors.muted,
          callback(value) { return shortDate(this.getLabelForValue(value)); }
        }
      },
      y: {
        beginAtZero: true,
        grid: { color: colors.grid },
        ticks: { color: colors.muted, callback: (value) => compact.format(value) }
      }
    },
    plugins: { legend: { position: "top", align: "start", labels: { color: "#17232d" } } }
  };
}

export default function Dashboard() {
  const [countries, setCountries] = useState([]);
  const [countryCode, setCountryCode] = useState("");
  const [from, setFrom] = useState("2020-02-01");
  const [to, setTo] = useState("2020-03-31");
  const [metric, setMetric] = useState("confirmed");
  const [log, setLog] = useState(false);
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/countries", { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not load countries.");
        return result;
      })
      .then((result) => {
        setCountries(result.countries);
        setCountryCode((current) => current || result.countries[0]?.code || "");
        setFrom(result.period.from);
        setTo(result.period.to);
      })
      .catch((problem) => {
        if (problem.name !== "AbortError") setError(problem.message);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!countryCode || !from || !to) return undefined;
    const controller = new AbortController();
    const query = new URLSearchParams({ from, to });
    setLoading(true);
    fetch(`/api/countries/${encodeURIComponent(countryCode)}?${query}`, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not load country data.");
        return result;
      })
      .then((result) => { setPayload(result); setError(""); })
      .catch((problem) => {
        if (problem.name !== "AbortError") setError(problem.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [countryCode, from, to]);

  const trendData = useMemo(() => ({
    labels: payload?.timeline || [],
    datasets: [
      { label: "Confirmed", data: payload?.trend.confirmed || [], borderColor: colors.confirmed, backgroundColor: colors.confirmed, borderWidth: 2.5, pointRadius: 3, spanGaps: true },
      { label: "Deaths", data: payload?.trend.deaths || [], borderColor: colors.deaths, backgroundColor: colors.deaths, borderWidth: 2.5, pointRadius: 3, spanGaps: true },
      { label: "Recovered", data: payload?.trend.recovered || [], borderColor: colors.recovered, backgroundColor: colors.recovered, borderWidth: 2.5, pointRadius: 3, spanGaps: true }
    ]
  }), [payload]);

  const dailyEstimates = payload?.daily?.[metric] || [];
  const dailyData = {
    labels: payload?.timeline || [],
    datasets: [{
      label: metricOptions[metric].title,
      data: dailyEstimates.map((estimate) => estimate?.value ?? null),
      meta: dailyEstimates,
      backgroundColor: colors[metric],
      borderWidth: 0,
      barPercentage: 1,
      categoryPercentage: 0.92
    }]
  };
  const base = baseOptions();
  const trendOptions = {
    ...base,
    scales: { ...base.scales, y: { ...base.scales.y, type: log ? "logarithmic" : "linear", min: log ? 1 : 0 } },
    plugins: {
      ...base.plugins,
      tooltip: {
        filter: (item) => item.raw != null,
        callbacks: {
          title: (items) => items.length ? longDate(items[0].label) : "",
          label: (context) => `${context.dataset.label}: ${number.format(context.raw)}`
        }
      }
    }
  };
  const dailyOptions = {
    ...base,
    plugins: {
      ...base.plugins,
      legend: { display: false },
      tooltip: {
        filter: (item) => item.raw != null,
        callbacks: {
          title: (items) => items.length ? longDate(items[0].label) : "",
          label: (context) => `${number.format(Math.round(context.raw))} ${metricOptions[metric].unit} a day, on average`,
          afterLabel: (context) => {
            const detail = context.dataset.meta[context.dataIndex];
            return detail ? `Reports ${shortDate(detail.from)} to ${shortDate(detail.to)}, ${number.format(detail.total)} in ${detail.span} days` : "";
          }
        }
      }
    }
  };

  function applyRange(nextFrom, nextTo) {
    if (!nextFrom || !nextTo || nextFrom > nextTo) {
      setError("The start date must be on or before the end date.");
      return;
    }
    setError("");
    setFrom(nextFrom);
    setTo(nextTo);
  }

  function choosePreset(name) {
    if (name === "feb") applyRange("2020-02-01", "2020-02-29");
    else if (name === "mar") applyRange("2020-03-01", "2020-03-31");
    else applyRange("2020-02-01", "2020-03-31");
  }

  const activeCountry = countries.find((country) => country.code === countryCode);
  const latest = payload?.latest;
  const peak = payload?.peakDailyCases;

  return <>
    <header className="top">
      <h1>COVID-19 early outbreak</h1>
      <p className="sub">Confirmed cases, deaths and recoveries, 1 February to 31 March 2020. Source, Johns Hopkins CSSE.</p>
    </header>
    <main>
      <section className="controls" aria-label="Choose a country and a date range">
        <div className="country">
          <label htmlFor="country">Country</label>
          <select id="country" value={countryCode} onChange={(event) => setCountryCode(event.target.value)} disabled={!countries.length}>
            {countries.map((country) => <option value={country.code} key={country.code}>{country.name}</option>)}
          </select>
        </div>
        <div className="range">
          <div className="field"><label htmlFor="from">From</label><input id="from" type="date" min="2020-02-01" max="2020-03-31" value={from} onChange={(event) => applyRange(event.target.value, to)} /></div>
          <div className="field"><label htmlFor="to">To</label><input id="to" type="date" min="2020-02-01" max="2020-03-31" value={to} onChange={(event) => applyRange(from, event.target.value)} /></div>
          <div className="presets" role="group" aria-label="Quick date ranges">
            <button type="button" onClick={() => choosePreset("all")}>Full period</button>
            <button type="button" onClick={() => choosePreset("feb")}>February</button>
            <button type="button" onClick={() => choosePreset("mar")}>March</button>
          </div>
        </div>
      </section>

      {error && <p className="error" role="alert">{error}</p>}
      <section aria-live="polite">
        <p className="as-of">{loading ? "Loading country data…" : latest ? `As of ${longDate(latest.date)}${latest.date === to ? "." : ", the latest report in this range."}` : `${activeCountry?.name || "This country"} has no reports in this range. Widen the date range.`}</p>
        <dl className="metrics">
          <div className="metric confirmed"><dt>Confirmed</dt><dd>{latest?.confirmed == null ? "-" : number.format(latest.confirmed)}</dd></div>
          <div className="metric deaths"><dt>Deaths</dt><dd>{latest?.deaths == null ? "-" : number.format(latest.deaths)}</dd></div>
          <div className="metric recovered"><dt>Recovered</dt><dd>{latest?.recovered == null ? "-" : number.format(latest.recovered)}</dd></div>
          <div className="metric active"><dt>Active</dt><dd>{payload?.metrics?.active == null ? "-" : number.format(payload.metrics.active)}</dd></div>
        </dl>

        <div className="grid">
          <div className="charts">
            <section className="chart-block">
              <div className="chart-head"><h2>Cumulative totals</h2><label className="check"><input type="checkbox" checked={log} onChange={(event) => setLog(event.target.checked)} /> Log scale</label></div>
              <div className="canvas-wrap"><Line data={trendData} options={trendOptions} plugins={[whoMarker]} /></div>
              <p className="note">Dots mark dates with a report. Lines join reports across days without one. The dashed line marks the WHO pandemic declaration on 11 March 2020.</p>
            </section>
            <section className="chart-block">
              <div className="chart-head"><h2>{metricOptions[metric].title}</h2><div className="seg" role="group" aria-label="Choose what the bars show">
                {Object.keys(metricOptions).map((key) => <button type="button" key={key} aria-pressed={metric === key} onClick={() => setMetric(key)}>{key === "confirmed" ? "Cases" : key === "deaths" ? "Deaths" : "Recoveries"}</button>)}
              </div></div>
              <div className="canvas-wrap"><Bar data={dailyData} options={dailyOptions} plugins={[whoMarker]} /></div>
              <p className="note">Each bar shows the average per day between two reports. The first report has no bar because there is no earlier report to compare with.</p>
            </section>
          </div>
          <aside className="insights"><h2>What the data shows</h2><ul>
            {payload?.reports.length ? <>
              <li>{payload.reports.length} reports for {payload.country.name} fall within the selected period.</li>
              {peak && <li>Fastest estimated growth was {number.format(Math.round(peak.value))} new cases a day, from {shortDate(peak.from)} to {shortDate(peak.to)}.</li>}
              {latest && payload.metrics?.active != null && <li>At the latest report, {number.format(payload.metrics.active)} cases were active (confirmed minus deaths and recoveries).</li>}
            </> : !loading && <li>No reports fall in this range, so there is nothing to compare.</li>}
          </ul></aside>
        </div>
      </section>
    </main>
    <footer><p>Active cases are confirmed minus deaths minus recoveries. Daily bars are estimates built from cumulative totals. See README for calculation details.</p></footer>
  </>;
}
