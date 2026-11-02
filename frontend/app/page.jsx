"use client";

import { useEffect, useState } from "react";

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
    </main>
  );
}
