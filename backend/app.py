import csv
from datetime import date
from io import StringIO

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import Response

from backend.analysis import report, source

app = FastAPI(title="Windwise API", version="1.0.0")


def checked_report(decision_from, decision_to, cutoff_hour):
    if not date(2026, 1, 1) <= decision_from <= decision_to <= date(2026, 1, 31):
        raise HTTPException(
            422, "Decision dates must be ordered and within January 2026."
        )
    return report(decision_from, decision_to, cutoff_hour)


@app.get("/api/health")
def health():
    _, manifest = source()
    return {"status": "ok", "snapshotSha256": manifest["sha256"]}


@app.get("/api/analysis")
def analysis(
    decision_from: date = date(2026, 1, 1),
    decision_to: date = date(2026, 1, 31),
    cutoff_hour: int = Query(9, ge=0, le=23),
):
    return checked_report(decision_from, decision_to, cutoff_hour)


@app.get("/api/export")
def export(
    decision_from: date = date(2026, 1, 1),
    decision_to: date = date(2026, 1, 31),
    cutoff_hour: int = Query(9, ge=0, le=23),
):
    result = checked_report(decision_from, decision_to, cutoff_hour)
    out = StringIO()
    writer = csv.DictWriter(out, fieldnames=list(result["rows"][0]))
    writer.writeheader()
    writer.writerows(result["rows"])
    return Response(
        out.getvalue(),
        media_type="text/csv",
        headers={
            "Content-Disposition": 'attachment; filename="windwise-hourly.csv"',
            "X-Snapshot-SHA256": result["provenance"]["sha256"],
        },
    )
