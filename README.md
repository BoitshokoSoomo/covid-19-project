# COVID-19 Early Outbreak Dashboard

This branch includes milestones 1 and 2: project setup, API data loading, a country selector populated from the supplied JSON dataset, and a cumulative line chart for confirmed cases, deaths, and recoveries.

## Run locally

Install Node.js 20.9 or newer, then run `npm install` from the repository root.

In one terminal run `npm run dev:backend`. In another terminal run `npm run dev:frontend`, then open http://localhost:3000.

The backend loads `backend/data/covid-19.json`. The frontend requests the country list and the selected country's reports through the `/api` routes. Open the browser console to see the loaded report payload.
