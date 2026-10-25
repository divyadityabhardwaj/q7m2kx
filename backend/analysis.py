"""Pure, auditable as-of selection and hourly forecast evaluation."""

import json
import math
from collections import defaultdict
from datetime import UTC, date, datetime, time, timedelta
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def instant(value: str) -> datetime:
    return datetime.fromisoformat(value)


@lru_cache(maxsize=1)
def source():
    snapshot = json.loads((ROOT / "data/snapshot.json").read_text())
    manifest = json.loads((ROOT / "data/manifest.json").read_text())
    return snapshot, manifest


def percentile(values, fraction):
    if not values:
        return None
    ordered = sorted(values)
    index = (len(ordered) - 1) * fraction
    low, high = math.floor(index), math.ceil(index)
    return ordered[low] + (ordered[high] - ordered[low]) * (index - low)


def metrics(rows):
    matched = [r for r in rows if r["errorMw"] is not None]
    errors = [r["errorMw"] for r in matched]
    absolute = [abs(e) for e in errors]
    n = len(errors)
    actual_sum = sum(r["actualMw"] for r in matched)
    return {
        "matchedHours": n,
        "expectedHours": len(rows),
        "coveragePct": 100 * n / len(rows) if rows else 0,
        "maeMw": sum(absolute) / n if n else None,
        "rmseMw": math.sqrt(sum(e * e for e in errors) / n) if n else None,
        "biasMw": sum(errors) / n if n else None,
        "wapePct": 100 * sum(absolute) / actual_sum if actual_sum else None,
        "p90AbsoluteErrorMw": percentile(absolute, 0.9),
        "forecastMwh": sum(
            r["forecastMw"] for r in rows if r["forecastMw"] is not None
        ),
        "actualMwh": actual_sum,
        "shortfallMwh": sum(max(e, 0) for e in errors),
        "surplusMwh": sum(max(-e, 0) for e in errors),
    }


def evaluate(snapshot, decision_from: date, decision_to: date, cutoff_hour: int):
    """An hourly WINDFOR point is compared with two complete FUELHH halves.

    For each target hour select max(publishTime) <= the previous day's cutoff.
    Never fill absent observations, interpolate a forecast, or use future issues.
    """
    forecasts = defaultdict(list)
    for row in snapshot["forecasts"]:
        forecasts[row["startTime"]].append(row)
    actuals = {}
    for row in snapshot["actuals"]:
        key = row["startTime"]
        if key not in actuals or row["publishTime"] > actuals[key]["publishTime"]:
            actuals[key] = row
    rows = []
    current = decision_from
    while current <= decision_to:
        cutoff = datetime.combine(current, time(cutoff_hour), tzinfo=UTC)
        delivery = current + timedelta(days=1)
        for hour in range(24):
            target = datetime.combine(delivery, time(hour), tzinfo=UTC)
            key = target.strftime("%Y-%m-%dT%H:%M:%SZ")
            candidates = [
                r for r in forecasts.get(key, []) if instant(r["publishTime"]) <= cutoff
            ]
            forecast = (
                max(candidates, key=lambda r: r["publishTime"]) if candidates else None
            )
            halves = [
                actuals.get(
                    (target + timedelta(minutes=m)).strftime("%Y-%m-%dT%H:%M:%SZ")
                )
                for m in (0, 30)
            ]
            actual = sum(r["generation"] for r in halves) / 2 if all(halves) else None
            predicted = forecast["generation"] if forecast else None
            rows.append(
                {
                    "decisionDate": str(current),
                    "startTime": key,
                    "cutoffTime": cutoff.isoformat().replace("+00:00", "Z"),
                    "publishTime": forecast["publishTime"] if forecast else None,
                    "forecastMw": predicted,
                    "actualMw": actual,
                    "errorMw": predicted - actual
                    if predicted is not None and actual is not None
                    else None,
                    "leadHours": (
                        target - instant(forecast["publishTime"])
                    ).total_seconds()
                    / 3600
                    if forecast
                    else None,
                    "issueAgeHours": (
                        cutoff - instant(forecast["publishTime"])
                    ).total_seconds()
                    / 3600
                    if forecast
                    else None,
                }
            )
        current += timedelta(days=1)
    return rows


@lru_cache(maxsize=128)
def report(decision_from: date, decision_to: date, cutoff_hour: int):
    snapshot, manifest = source()
    rows = evaluate(snapshot, decision_from, decision_to, cutoff_hour)
    by_day = defaultdict(list)
    by_hour = defaultdict(list)
    for row in rows:
        by_day[row["decisionDate"]].append(row)
        by_hour[row["startTime"][11:13]].append(row)
    return {
        "rows": rows,
        "summary": metrics(rows),
        "daily": [
            {
                "decisionDate": day,
                "deliveryDate": str(date.fromisoformat(day) + timedelta(days=1)),
                **metrics(group),
            }
            for day, group in by_day.items()
        ],
        "hourly": [
            {"hour": int(hour), **metrics(group)}
            for hour, group in sorted(by_hour.items())
        ],
        "worstHours": sorted(
            [r for r in rows if r["errorMw"] is not None],
            key=lambda r: abs(r["errorMw"]),
            reverse=True,
        )[:8],
        "provenance": {k: v for k, v in manifest.items() if k != "requests"},
        "selection": {
            "decisionFrom": str(decision_from),
            "decisionTo": str(decision_to),
            "cutoffHourUtc": cutoff_hour,
            "errorSign": "forecast minus actual",
            "resolutionMinutes": 60,
        },
    }
