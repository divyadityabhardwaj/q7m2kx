import math
from datetime import date

import pytest
from fastapi.testclient import TestClient

from backend.analysis import evaluate, metrics, report, source
from backend.app import app


def forecast(hour, published, value):
    return {
        "startTime": f"2026-01-02T{hour:02}:00:00Z",
        "publishTime": published,
        "generation": value,
    }


def actual(minute, value):
    return {
        "startTime": f"2026-01-02T00:{minute:02}:00Z",
        "publishTime": "2026-01-03T00:00:00Z",
        "generation": value,
    }


def test_as_of_selection_and_hourly_alignment():
    data = {
        "forecasts": [
            forecast(0, "2026-01-01T08:30:00Z", 100),
            forecast(0, "2026-01-01T09:00:00Z", 120),
            forecast(0, "2026-01-01T09:00:01Z", 999),
        ],
        "actuals": [actual(0, 80), actual(30, 100)],
    }
    rows = evaluate(data, date(2026, 1, 1), date(2026, 1, 1), 9)
    assert len(rows) == 24
    assert rows[0]["forecastMw"] == 120
    assert rows[0]["actualMw"] == 90
    assert rows[0]["errorMw"] == 30
    assert rows[0]["leadHours"] == 15
    assert rows[0]["issueAgeHours"] == 0
    assert rows[1]["errorMw"] is None
    assert metrics(rows)["coveragePct"] == pytest.approx(100 / 24)


def test_missing_half_hour_is_not_filled():
    rows = evaluate(
        {
            "forecasts": [forecast(0, "2026-01-01T07:30:00Z", 120)],
            "actuals": [actual(0, 100)],
        },
        date(2026, 1, 1),
        date(2026, 1, 1),
        9,
    )
    assert rows[0]["actualMw"] is None
    assert rows[0]["errorMw"] is None
    assert metrics(rows)["maeMw"] is None


def test_metrics_units_sign_zero_and_percentile():
    rows = [
        {"forecastMw": 130, "actualMw": 100, "errorMw": 30},
        {"forecastMw": 90, "actualMw": 100, "errorMw": -10},
    ]
    result = metrics(rows)
    assert result["maeMw"] == 20
    assert result["rmseMw"] == math.sqrt(500)
    assert result["biasMw"] == 10
    assert result["wapePct"] == 20
    assert result["p90AbsoluteErrorMw"] == 28
    assert result["shortfallMwh"] == 30
    assert result["surplusMwh"] == 10
    assert result["forecastMwh"] == 220
    assert metrics([{"forecastMw": 0, "actualMw": 0, "errorMw": 0}])["wapePct"] is None


def test_snapshot_integrity_coverage_and_no_lookahead():
    import hashlib

    from backend.analysis import ROOT, instant

    _, manifest = source()
    assert (
        hashlib.sha256((ROOT / "data/snapshot.json").read_bytes()).hexdigest()
        == manifest["sha256"]
    )
    for cutoff in (0, 9, 23):
        result = report(date(2026, 1, 1), date(2026, 1, 31), cutoff)
        assert len(result["rows"]) == 744
        # At midnight the latest available issue does not yet cover the last
        # two hours of the following day. Missing targets must remain missing.
        assert result["summary"]["matchedHours"] == (682 if cutoff == 0 else 744)
        assert result["rows"][0]["startTime"] == "2026-01-02T00:00:00Z"
        assert result["rows"][-1]["startTime"] == "2026-02-01T23:00:00Z"
        for row in result["rows"]:
            assert instant(row["cutoffTime"]) < instant(row["startTime"])
            if row["publishTime"]:
                assert instant(row["publishTime"]) <= instant(row["cutoffTime"])
            else:
                assert row["errorMw"] is None


def test_api_validation_and_export():
    client = TestClient(app)
    assert client.get("/api/health").status_code == 200
    response = client.get(
        "/api/analysis?decision_from=2026-01-14&decision_to=2026-01-14&cutoff_hour=9"
    )
    assert response.status_code == 200
    assert len(response.json()["rows"]) == 24
    for query in (
        "decision_from=2025-12-31",
        "decision_to=2026-02-01",
        "decision_from=2026-01-20&decision_to=2026-01-01",
        "cutoff_hour=24",
        "cutoff_hour=-1",
        "decision_from=broken",
    ):
        assert client.get("/api/analysis?" + query).status_code == 422
    csv = client.get("/api/export?decision_from=2026-01-14&decision_to=2026-01-14")
    assert csv.status_code == 200
    assert len(csv.text.splitlines()) == 25
    assert "publishTime" in csv.text.splitlines()[0]
    assert csv.headers["x-snapshot-sha256"]
