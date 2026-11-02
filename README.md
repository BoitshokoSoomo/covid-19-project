# COVID-19 Early Outbreak Dashboard

An interactive dashboard for reported COVID-19 cases, deaths, and recoveries from 1 February to 31 March 2020. This repository separates the user interface and data API so frontend and backend contributors can work independently.

## Project structure

```text
frontend/   Next.js and React dashboard, charts, and page styling
backend/    Express API, dataset, calculations, and calculation tests
screenshots/Testing evidence from the original dashboard implementation
```

The frontend only talks to the backend through the `/api` endpoints. Next.js proxies those requests to the local API server, so no browser CORS setup is required.

## Requirements and setup

Install Node.js 20.9 or newer. From the repository root, install all workspace dependencies:

```bash
npm install
```

Open two terminals in the repository root.

Terminal 1, start the backend API:

```bash
npm run dev:backend
```

The API listens at `http://localhost:4000`. Check it at `http://localhost:4000/api/health`.

Terminal 2, start the Next.js frontend:

```bash
npm run dev:frontend
```

Open [http://localhost:3000](http://localhost:3000).

For a production frontend build, run `npm run build:frontend`. Start the built frontend with `npm run start:frontend` and the API with `npm run start:backend`.

## API

- `GET /api/health` returns the API status.
- `GET /api/countries` returns country names, codes, source, and data period.
- `GET /api/countries/:code?from=YYYY-MM-DD&to=YYYY-MM-DD` returns the selected range, metrics, aligned trend series, daily estimates, and reporting gaps.

The API reads `backend/data/covid-19.json` and keeps the calculations in `backend/src/calc.js`. The frontend receives chart-ready responses from the API.

## Data and calculation choices

The dataset is from the Johns Hopkins CSSE COVID-19 Data Repository and contains 5 to 7 reports per country, with gaps of 4 to 19 days.

- Latest metrics use the newest report within the selected date range.
- Active cases are confirmed minus deaths minus recoveries. For China on 31 March: 81,554 − 3,312 − 76,128 = 2,114.
- Daily changes are estimates: for each pair of consecutive reports, subtract the earlier cumulative value from the later one and divide by the days between reports. That average is assigned to each day in the interval. For China, 10–20 February: (75,569 − 42,638) / 10 = 3,293.1 new cases per day.
- The first report has no daily estimate because it has no earlier report. Missing report dates are not treated as zero.

The cumulative line chart marks report dates with dots. Its lines connect sparse reports to make trends easier to compare; they do not represent daily observations. The daily bar chart displays evenly allocated averages, not actual daily counts.

## Checks and evidence

Run backend calculation tests from the repository root:

```bash
npm run test:backend
```

The tests validate active-case arithmetic, leap-day date calculations, missing reports, South Africa's first case, and daily estimates against the supplied dataset. The `screenshots/` folder contains the original dashboard evidence for China, Italy, South Korea, the United States, South Africa, and responsive layouts.

## Data limitations

Counts reflect reported cases, not all infections. Reporting schedules and testing differed by country. Daily bars average changes across reporting gaps, and recovery totals are not directly comparable between countries.
