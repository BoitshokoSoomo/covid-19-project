# COVID-19 Early Outbreak Dashboard

This branch includes milestones 1 to 3: project setup and country selection, cumulative trends, metric cards, estimated daily changes, and a date range filter.

Daily values are averages between consecutive cumulative reports because the source dataset is sparse. See the final milestone documentation for the detailed calculation and data limitations.

## Run locally

Install Node.js 20.9 or newer, then run `npm install` from the repository root.

In one terminal run `npm run dev:backend`. In another terminal run `npm run dev:frontend`, then open http://localhost:3000.

The backend loads `backend/data/covid-19.json`. The frontend requests the country list and the selected country's reports through the `/api` routes. Open the browser console to see the loaded report payload.
