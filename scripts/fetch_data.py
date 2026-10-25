"""Fetch the bounded Elexon source snapshot. No credentials or synthetic data."""

import hashlib
import json
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://data.elexon.co.uk/bmrs/api/v1/datasets/"


def fetch(task):
    dataset, params = task
    url = BASE + dataset + "/stream?" + urlencode(params)
    for attempt in range(4):
        try:
            with urlopen(
                Request(url, headers={"Accept": "application/json"}), timeout=60
            ) as response:
                rows = json.load(response)
            if not isinstance(rows, list):
                raise TypeError(f"Unexpected response for {dataset}")
            print(
                f"{dataset} {next(iter(params.values()))}: {len(rows)} records",
                flush=True,
            )
            return url, rows
        except Exception:
            if attempt == 3:
                raise
            time.sleep(2**attempt)


def main():
    tasks = []
    for offset in range(33):
        day = date(2025, 12, 30) + timedelta(days=offset)
        tasks.append(
            (
                "WINDFOR",
                {
                    "publishDateTimeFrom": f"{day}T00:00Z",
                    "publishDateTimeTo": f"{day + timedelta(days=1)}T00:00Z",
                },
            )
        )
    for offset in range(31):
        day = date(2026, 1, 2) + timedelta(days=offset)
        tasks.append(
            (
                "FUELHH",
                {
                    "settlementDateFrom": str(day),
                    "settlementDateTo": str(day),
                    "fuelType": "WIND",
                },
            )
        )
    forecasts, actuals, requests = {}, {}, []
    with ThreadPoolExecutor(max_workers=4) as pool:
        for (dataset, _), (url, rows) in zip(tasks, pool.map(fetch, tasks)):
            requests.append({"url": url, "receivedRows": len(rows)})
            for row in rows:
                start, published, value = (
                    row["startTime"],
                    row["publishTime"],
                    row["generation"],
                )
                if not "2026-01-02T00:00:00Z" <= start < "2026-02-02T00:00:00Z":
                    continue
                if not isinstance(value, (float, int)) or value < 0:
                    raise ValueError("Invalid generation value")
                if dataset == "WINDFOR" and published < "2026-02-01T00:00:00Z":
                    key = (start, published)
                    if key in forecasts and forecasts[key] != value:
                        raise ValueError(f"Conflicting forecast {key}")
                    forecasts[key] = value
                elif dataset == "FUELHH" and row["fuelType"] == "WIND":
                    if start not in actuals or published > actuals[start][0]:
                        actuals[start] = (published, value)
    snapshot = {
        "forecasts": [
            {"startTime": start, "publishTime": pub, "generation": value}
            for (start, pub), value in sorted(forecasts.items())
        ],
        "actuals": [
            {"startTime": start, "publishTime": pub, "generation": value[1]}
            for start, value in sorted(actuals.items())
            for pub in [value[0]]
        ],
    }
    encoded = (json.dumps(snapshot, separators=(",", ":")) + "\n").encode()
    (ROOT / "data" / "snapshot.json").write_bytes(encoded)
    manifest = {
        "source": "Elexon Insights Solution",
        "fetchedAt": datetime.now(UTC).isoformat(),
        "sha256": hashlib.sha256(encoded).hexdigest(),
        "forecastRows": len(forecasts),
        "actualRows": len(actuals),
        "decisionDates": ["2026-01-01", "2026-01-31"],
        "deliveryDates": ["2026-01-02", "2026-02-01"],
        "requests": requests,
    }
    (ROOT / "data" / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"Saved {len(forecasts)} forecasts and {len(actuals)} actuals")


if __name__ == "__main__":
    main()
