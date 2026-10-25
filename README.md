# Windwise

A compact day-ahead wind forecasting workspace for Great Britain. Inspect the forecast available at a historical decision time, compare it with observed generation, and export every selected hourly record.

**Live app:** https://q7m2kx.vercel.app  
**Repository:** https://github.com/divyadityabhardwaj/q7m2kx

## Run

Docker (Node and Python are built inside the container):

```sh
docker compose up --build
```

Open http://localhost:8000. The container serves the React build and Python API from the same origin and runs as a non-root user. Stop with `docker compose down`.

For development, use Node 22+ and Python 3.12+:

```sh
npm ci
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/uvicorn backend.app:app --reload --port 8000
```

In a second terminal, run `npm run dev` and open http://localhost:5173. Vite proxies `/api` to Python. No API keys or environment variables are required.

## Use

- **Overview:** choose decision dates and the daily cutoff; step through the selected decision days to inspect next-day forecasts. Hover over the chart to inspect the exact publication time. Toggle the retrospective actual line.
- **Accuracy:** see forecast/actual pairs, error by delivery hour, and the largest misses.
- **Method:** read the selection rules and source provenance.
- **Export data:** download the selected hourly pairs, issue timestamps, cutoff, lead time, and signed errors as CSV.

## Data and decision rules

Only Elexon **WINDFOR** forecasts and **FUELHH**, filtered to `fuelType=WIND`, supply generation values. The committed snapshot contains **17,864 forecast records** and **1,488 half-hour actuals**. `data/manifest.json` records the retrieval time, every source request, received row counts and the SHA-256 hash of the snapshot.

The brief is interpreted as **purchase decisions made during 1–31 January 2026**, so delivery covers **2 January–1 February 2026**. This deliberately includes 1 February delivery for the 31 January decision and excludes 1 January delivery, whose day-ahead decision occurred in December. Earlier publication records are included only when relevant to these decisions.

For a decision date D and each target hour on D+1:

1. Construct the selected cutoff on D in UTC. The default **09:00 UTC is an illustrative assumption**, not an asserted market gate closure; all whole-hour cutoffs are selectable. UK local time is GMT throughout this window.
2. Select the forecast for that exact target with the greatest `publishTime` **at or before the cutoff**. Future issues never enter the historical decision.
3. WINDFOR targets in this extract are hourly. Average the two complete FUELHH half-hours to get the comparable hourly actual in MW. There is no interpolation, forward fill, zero fill or invented generation.
4. Leave unmatched values blank and exclude them from paired error statistics. Report the matched-hour count. At 00:00, available issues lack the final two hours of next-day delivery: coverage is 682/744. At the default 09:00, coverage is 744/744.

The snapshot uses the latest returned actual publication per half-hour. These are retrospective observations, potentially subject to revision, not the information available to the buyer. The app does not make runtime requests to Elexon; the historical workspace is deterministic and works without the upstream API being available.

Refresh the bounded source snapshot explicitly with:

```sh
python3 scripts/fetch_data.py
```

This uses four concurrent requests with timeouts and bounded retries, checks values, rejects conflicting duplicate forecasts, deduplicates overlaps and writes new provenance. Re-run tests after a refresh. No recurring collection is configured.

### Metrics

Let `e = forecast MW − actual MW` across matched hourly pairs:

| Metric | Definition |
| --- | --- |
| MAE | `mean(abs(e))`, MW |
| RMSE | `sqrt(mean(e²))`, MW |
| Bias | `mean(e)`, MW; positive means wind overestimation |
| WAPE | `100 × sum(abs(e)) / sum(actual)`, %; undefined for zero total actual |
| P90 absolute error | Linearly interpolated 90th percentile of `abs(e)`, MW |
| Wind shortfall | `sum(max(e, 0) × 1 hour)`, MWh; retrospective |

Forecast energy sums available forecast hours. Actual energy and shortfall use matched hours. Every energy interval is one hour, so `MW × 1 h = MWh`. Missing coverage must be considered when comparing cutoffs. The P90 error is a historical statistic, not a calibrated prediction interval or a recommended buffer.

At the default 09:00 cutoff across January decisions, the committed snapshot gives **MAE 2,038.9 MW**, **RMSE 2,504.8 MW**, **bias +1,747.9 MW**, and **WAPE 18.07%** over 744 matched hours. The comparison shows substantial positive wind bias in this sample. It does not identify the cause or guarantee the same behaviour in another month.

National wind is not a supplier's customer demand or contracted wind portfolio. Demand, other supply, market prices, curtailment attribution, transaction costs and portfolio exposure are outside the brief. The pilot supports forecast inspection and historical error analysis; it cannot determine an executable thermal procurement volume or trading profit.

Sources: [WINDFOR stream documentation](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream), [FUELHH stream documentation](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream), and [Elexon's explanation of wind forecast and outturn](https://bmrs.elexon.co.uk/wind-generation). Contains BMRS data © Elexon Limited copyright and database right 2026. Source data remains subject to Elexon's applicable data terms.

## Structure and design

| Path | Purpose |
| --- | --- |
| `frontend/src/main.tsx` | Workspace state, filters and the daily outlook |
| `frontend/src/AccuracyView.tsx` | Error charts and ranked hourly misses |
| `frontend/src/MethodView.tsx` | Source and methodology view |
| `frontend/src/shared.tsx`, `types.ts`, `style.css` | Shared formatting, display components, response types and responsive styling |
| `backend/analysis.py` | Pure as-of selection, alignment, aggregation and metrics |
| `backend/app.py` | FastAPI validation and JSON/CSV endpoints |
| `api/index.py` | Vercel ASGI entrypoint, reusing the same backend |
| `data/` | Bounded real-data snapshot and provenance manifest |
| `scripts/fetch_data.py` | Explicit source refresh |
| `scripts/serve.py` | Same-origin static serving for Docker |
| `tests/test_analysis.py` | Numerical, temporal, data-integrity and API tests |
| `Dockerfile`, `compose.yaml` | Multi-stage build and local runtime |
| `vercel.json` | Static frontend plus Python function routing |
| `.github/workflows/ci.yml` | Frontend build, Python tests and Docker build |

React and TypeScript handle interaction; Recharts renders the data. FastAPI owns all calculations so the browser, CSV and deployed API agree. Pure analysis functions are separate from HTTP handling. A bounded in-process report cache avoids repeating calculations; it is an optimization and not persistent state. There is no database, authentication, paid API or secret configuration.

The UI keeps short labels and puts detailed definitions in tooltips and Method. The layout responds to mobile widths, keyboard focus is visible, and reduced-motion preferences are respected. Visual references: [Linear's UI redesign](https://linear.app/now/how-we-redesigned-the-linear-ui) and [Creava's energy analytics dashboard](https://dribbble.com/shots/26838026-Energy-Consumption-Analytics-Dashboard); the implementation is custom.

## API

- `GET /api/health`: readiness and snapshot checksum.
- `GET /api/analysis?decision_from=2026-01-01&decision_to=2026-01-31&cutoff_hour=9`: hourly selections, period/day/hour statistics, worst hours and provenance.
- `GET /api/export` with the same parameters: CSV and snapshot hash header.

Invalid or reversed dates, decisions outside January and cutoffs outside 0–23 return HTTP 422. FastAPI's interactive API documentation is available locally at `/docs`.

## Verify

```sh
npm run build
.venv/bin/python -m pytest -q
docker build -t windwise .
```

Tests cover exact-cutoff inclusion, later-issue exclusion, complete half-hour alignment, missing values, signed error, metric formulas, zero denominators, percentile interpolation, snapshot integrity, boundary dates, early-cutoff gaps, API validation and CSV export. CI runs on pushes and pull requests. Browser checks cover navigation, date filters, cutoff changes, actual visibility and responsive layouts.

Deployment uses Vercel's static frontend and Python function runtime. Docker is the portable local deployment; Vercel does not run that Docker image. To redeploy from an authorized personal Vercel account, run `npx vercel@latest --prod`. Production access should be verified while signed out.

## Video walkthrough

The assignment requires an **unlisted YouTube video of at most 10 minutes**, with a client overview of at most five minutes and a technical overview of at most five minutes. The candidate will record and upload the presentation. A recording is not yet included in this repository.

Suggested recording sequence:

| Time | Show and explain |
| --- | --- |
| 0:00–0:45 | The buyer's need: see next-day wind forecasts available at the decision time and understand historical error. Clarify national scope. |
| 0:45–2:15 | Overview: January range, 09:00 cutoff, 14 January decision and 15 January delivery. Hover to reveal the 07:30 publication and turn actuals off/on. |
| 2:15–3:30 | Accuracy: MAE about 2,039 MW and positive bias about 1,748 MW; inspect the largest misses. Explain that national wind alone cannot determine the purchase volume. |
| 3:30–4:30 | Change cutoff to 00:00, show missing forecast hours and coverage, return to 09:00, then export CSV. |
| 4:30–5:00 | Client recap: traceable forecasts, quantified historical misses and transparent missing data. |
| 5:00–6:30 | Code: `backend/analysis.py`, exact as-of issue selection, two-half-hour alignment, error sign and units. |
| 6:30–7:30 | `backend/app.py`, shared API/CSV logic, date validation, React views and request cancellation. |
| 7:30–8:30 | Source snapshot, manifest, refresh script, deterministic deployment and no API credentials. |
| 8:30–9:30 | Run tests; show temporal and missing-data checks, Docker build and CI. Explain Vercel's static frontend/Python function split. |
| 9:30–10:00 | Limits and sensible next step: a confirmed trading cutoff and supplier demand/contract data, with out-of-sample error calibration. |

Before submitting, record the video, set it to **Unlisted**, and verify the repository, app and video URLs in an incognito window. The submission form has not been sent.

## AI assistance

This project was developed with **OpenAI Codex** for implementation, design research, data ingestion, testing and deployment. AI assistance is disclosed as permitted by the assignment. No synthetic generation values or personal work achievements were added. The candidate should review the implementation and present their own understanding in the video.
