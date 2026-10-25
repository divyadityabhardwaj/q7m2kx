import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownToLine,
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Gauge,
  LayoutDashboard,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Wind,
  X,
} from "lucide-react";
import type { Report } from "./types";
import {
  number,
  shortDate,
  fullDate,
  timeOf,
  addDay,
  colors,
  Info,
  Stat,
  HourTooltip,
} from "./shared";
import { AccuracyView } from "./AccuracyView";
import { MethodView } from "./MethodView";
import "./style.css";

function App() {
  const [tab, setTab] = useState("overview");
  const [from, setFrom] = useState("2026-01-01");
  const [to, setTo] = useState("2026-01-31");
  const [cutoff, setCutoff] = useState(9);
  const [selected, setSelected] = useState("2026-01-14");
  const [data, setData] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [showActual, setShowActual] = useState(true);
  const [help, setHelp] = useState(false);
  const valid = from <= to;
  const query = new URLSearchParams({
    decision_from: from,
    decision_to: to,
    cutoff_hour: String(cutoff),
  }).toString();
  useEffect(() => {
    if (!valid) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch("/api/analysis?" + query, { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok)
          throw new Error("The analysis could not be loaded. Please retry.");
        return r.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [query, retry, valid]);
  useEffect(() => {
    if (!valid) return;
    if (selected < from) setSelected(from);
    else if (selected > to) setSelected(to);
  }, [from, to, selected, valid]);
  const hours = useMemo(
    () => data?.rows.filter((r) => r.decisionDate === selected) ?? [],
    [data, selected],
  );
  const day = data?.daily.find((d) => d.decisionDate === selected);
  const summary = data?.summary;
  const peak = hours.reduce((a, r) => Math.max(a, r.forecastMw ?? 0), 0);
  const issues = [...new Set(hours.map((r) => r.publishTime).filter(Boolean))];
  const title =
    tab === "overview"
      ? "Wind outlook"
      : tab === "performance"
        ? "Forecast accuracy"
        : "Method & sources";
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setTab("overview");
          }}
        >
          <span className="brand-icon">
            <Wind size={25} />
          </span>
          windwise<span className="brand-dot">.</span>
        </a>
        <div className="workspace">WORKSPACE</div>
        <nav aria-label="Main navigation">
          <button
            className={tab === "overview" ? "active" : ""}
            onClick={() => setTab("overview")}
          >
            <LayoutDashboard size={18} />
            Overview
          </button>
          <button
            className={tab === "performance" ? "active" : ""}
            onClick={() => setTab("performance")}
          >
            <Gauge size={18} />
            Accuracy
          </button>
          <button
            className={tab === "method" ? "active" : ""}
            onClick={() => setTab("method")}
          >
            <BookOpen size={18} />
            Method
          </button>
        </nav>
        <div className="sidebar-card">
          <span className="live-dot" /> Historical data
          <h3>January 2026</h3>
          <p>Great Britain · Elexon</p>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Analytics <ChevronRight size={13} />
            <span>Wind generation</span>
          </div>
          <div className="topbar-right">
            <span className="snapshot-badge">
              <span />
              Elexon snapshot
            </span>
            <button
              className="icon-button"
              onClick={() => setHelp(true)}
              aria-label="Open workspace help"
            >
              <CircleHelp size={19} />
            </button>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <h1>{title}</h1>
              <p>
                Great Britain <span className="heading-dot">·</span> January
                2026
              </p>
            </div>
            <a
              className="button export"
              href={"/api/export?" + query}
              aria-disabled={!valid}
              onClick={(e) => {
                if (!valid) e.preventDefault();
              }}
            >
              <ArrowDownToLine size={16} />
              Export data
            </a>
          </div>
          <section className="filter-bar" aria-label="Analysis filters">
            <div className="filter-group">
              <CalendarDays size={17} />
              <div>
                <span className="filter-label">DECISION DATES</span>
                <div className="date-inputs">
                  <input
                    aria-label="Decision start date"
                    type="date"
                    min="2026-01-01"
                    max="2026-01-31"
                    value={from}
                    onChange={(e) => {
                      if (e.target.value) setFrom(e.target.value);
                    }}
                  />
                  <span>→</span>
                  <input
                    aria-label="Decision end date"
                    type="date"
                    min="2026-01-01"
                    max="2026-01-31"
                    value={to}
                    onChange={(e) => {
                      if (e.target.value) setTo(e.target.value);
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="filter-group cutoff">
              <Clock3 size={17} />
              <div>
                <label className="filter-label" htmlFor="cutoff">
                  AS OF · UTC
                </label>
                <select
                  id="cutoff"
                  value={cutoff}
                  onChange={(e) => setCutoff(Number(e.target.value))}
                >
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, "0")}:00 UTC
                    </option>
                  ))}
                </select>
              </div>
              <Info text="Illustrative decision time, not a claimed exchange gate closure. Only issues published at or before this time on the decision day are eligible." />
            </div>
            <div className="filter-note">
              <span className="live-dot" />
              Next-day delivery
            </div>
          </section>
          {!valid ? (
            <div role="alert" className="error-state">
              Choose an end date on or after the start date.
            </div>
          ) : loading ? (
            <div className="loading-state" role="status">
              <LoaderCircle className="spin" />
              Selecting forecasts available at your cutoff…
            </div>
          ) : error ? (
            <div className="error-state" role="alert">
              {error}
              <button className="button" onClick={() => setRetry((n) => n + 1)}>
                <RefreshCw size={14} />
                Retry
              </button>
            </div>
          ) : (
            data &&
            summary && (
              <>
                <div className="period-label">
                  <span>PERIOD SUMMARY</span>
                  <small>
                    {shortDate(from)} – {shortDate(to)} decisions ·{" "}
                    {number(summary.matchedHours)} / {summary.expectedHours}{" "}
                    matched delivery hours
                  </small>
                </div>
                <section className="stats">
                  <Stat
                    label="Mean absolute error"
                    value={number(summary.maeMw)}
                    unit="MW"
                    detail="Typical size of the forecast miss"
                    accent
                    info="Mean |forecast − actual| across matched hourly delivery periods. Smaller is better."
                  />
                  <Stat
                    label="Root mean squared error"
                    value={number(summary.rmseMw)}
                    unit="MW"
                    detail="Larger misses carry more weight"
                    info="Square root of mean squared hourly error. Useful alongside MAE to spot outsized misses."
                  />
                  <Stat
                    label="Forecast bias"
                    value={
                      (summary.biasMw != null && summary.biasMw > 0
                        ? "+"
                        : "") + number(summary.biasMw)
                    }
                    unit="MW"
                    detail={
                      (summary.biasMw ?? 0) > 0
                        ? "Positive = wind overestimated"
                        : "Negative = wind underestimated"
                    }
                    info="Mean forecast − actual. Positive bias means less wind arrived than the forecast suggested."
                  />
                  <Stat
                    label="Weighted error"
                    value={number(summary.wapePct, 1)}
                    unit="%"
                    detail={`${number(summary.coveragePct, 1)}% matched-hour coverage`}
                    info="100 × sum of absolute errors ÷ sum of actual generation, over matched hours. No division by individual zero-output hours."
                  />
                </section>
                {summary.matchedHours < summary.expectedHours && (
                  <div className="notice">
                    <ShieldCheck size={18} />
                    <p>
                      <strong>
                        {summary.expectedHours - summary.matchedHours} delivery
                        hours unavailable at this cutoff.
                      </strong>{" "}
                      Unmatched hours are excluded from error metrics.
                    </p>
                  </div>
                )}
                {tab === "overview" && (
                  <>
                    <section className="panel forecast-panel">
                      <div className="panel-heading">
                        <div>
                          <h2>Next-day wind</h2>
                          <p>
                            Decision {shortDate(selected)} ·
                            {String(cutoff).padStart(2, "0")}:00 UTC
                          </p>
                        </div>
                        <div className="day-picker">
                          <button
                            disabled={selected <= from}
                            onClick={() => setSelected(addDay(selected, -1))}
                            aria-label="Previous decision day"
                          >
                            <ChevronLeft size={17} />
                          </button>
                          <label>
                            <CalendarDays size={15} />
                            <select
                              aria-label="Selected decision day"
                              value={selected}
                              onChange={(e) => setSelected(e.target.value)}
                            >
                              {data.daily.map((d) => (
                                <option
                                  key={d.decisionDate}
                                  value={d.decisionDate}
                                >
                                  {shortDate(d.decisionDate)} decision
                                </option>
                              ))}
                            </select>
                          </label>
                          <button
                            disabled={selected >= to}
                            onClick={() => setSelected(addDay(selected, 1))}
                            aria-label="Next decision day"
                          >
                            <ChevronRight size={17} />
                          </button>
                        </div>
                      </div>
                      <div className="chart-meta">
                        <span className="unit-label">POWER · MW</span>
                        <div className="legend">
                          <span>
                            <i style={{ background: colors.forecast }} />
                            As-of forecast
                          </span>
                          <label>
                            <input
                              type="checkbox"
                              checked={showActual}
                              onChange={(e) => setShowActual(e.target.checked)}
                            />
                            <i style={{ background: colors.actual }} />
                            Actual · hindsight
                          </label>
                        </div>
                      </div>
                      <div className="chart-wrap">
                        <ResponsiveContainer width="100%" height={300}>
                          <ComposedChart
                            data={hours}
                            margin={{ top: 15, right: 20, left: 4, bottom: 10 }}
                          >
                            <defs>
                              <linearGradient
                                id="windFill"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="0%"
                                  stopColor="#40ac93"
                                  stopOpacity={0.18}
                                />
                                <stop
                                  offset="100%"
                                  stopColor="#40ac93"
                                  stopOpacity={0}
                                />
                              </linearGradient>
                            </defs>
                            <CartesianGrid
                              strokeDasharray="3 5"
                              vertical={false}
                              stroke="#e7ece9"
                            />
                            <XAxis
                              dataKey="startTime"
                              tickFormatter={(v) => v.slice(11, 16)}
                              interval={3}
                              tickLine={false}
                              axisLine={false}
                              tick={{ fill: "#89918d", fontSize: 11 }}
                              dy={10}
                            />
                            <YAxis
                              tickFormatter={(v) => number(v)}
                              tickLine={false}
                              axisLine={false}
                              tick={{ fill: "#89918d", fontSize: 11 }}
                              width={64}
                            />
                            <Tooltip content={<HourTooltip />} />
                            <Area
                              type="linear"
                              dataKey="forecastMw"
                              stroke={colors.forecast}
                              strokeWidth={2.5}
                              fill="url(#windFill)"
                              connectNulls={false}
                              isAnimationActive={false}
                            />
                            {showActual && (
                              <Line
                                type="linear"
                                dataKey="actualMw"
                                stroke={colors.actual}
                                strokeWidth={2}
                                strokeDasharray="5 4"
                                dot={false}
                                connectNulls={false}
                                isAnimationActive={false}
                              />
                            )}
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="chart-footer">
                        <span>
                          <CalendarDays size={14} />
                          Delivery {fullDate(addDay(selected, 1))} · hourly
                          averages
                        </span>
                        <span>
                          {day?.matchedHours}/24 matched hours{" "}
                          <span className="footer-divider">|</span>
                          {issues.length === 1
                            ? `Issue ${timeOf(issues[0] ?? null)} UTC`
                            : `${issues.length} eligible issue times`}
                        </span>
                      </div>
                    </section>
                    <div className="lower-grid">
                      <section className="panel daily-panel">
                        <div className="panel-heading">
                          <div>
                            <h2>Daily forecast error</h2>
                            <p>
                              Daily mean absolute error · delivery following
                              each decision date
                            </p>
                          </div>
                          <span className="pill">MW</span>
                        </div>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart
                            data={data.daily}
                            margin={{ top: 16, right: 18, bottom: 8, left: 0 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 5"
                              vertical={false}
                              stroke="#e7ece9"
                            />
                            <XAxis
                              dataKey="decisionDate"
                              tickFormatter={shortDate}
                              interval="preserveStartEnd"
                              minTickGap={35}
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: "#89918d", fontSize: 10 }}
                            />
                            <YAxis
                              width={55}
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: "#89918d", fontSize: 10 }}
                            />
                            <Tooltip
                              labelFormatter={(v) =>
                                shortDate(String(v)) + " decision"
                              }
                              formatter={(v) => [
                                number(Number(v)) + " MW",
                                "Mean absolute error",
                              ]}
                              contentStyle={{
                                borderRadius: 12,
                                border: "1px solid #e2e8e4",
                                fontSize: 12,
                              }}
                            />
                            <Bar
                              dataKey="maeMw"
                              fill="#86b8a8"
                              radius={[3, 3, 0, 0]}
                              isAnimationActive={false}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                        <button
                          className="text-button"
                          onClick={() => setTab("performance")}
                        >
                          View accuracy
                          <ArrowRight size={15} />
                        </button>
                      </section>
                      <section className="insight-card">
                        <div className="daily-heading">
                          <h2>Delivery summary</h2>
                          <span>{shortDate(addDay(selected, 1))}</span>
                        </div>
                        <div className="summary-number">
                          <span>Forecast energy</span>
                          <strong>
                            {number(day?.forecastMwh)} <small>MWh</small>
                          </strong>
                        </div>
                        <div className="summary-number">
                          <span>Peak forecast</span>
                          <strong>
                            {number(peak)} <small>MW</small>
                          </strong>
                        </div>
                        <div className="summary-number">
                          <span>
                            Wind shortfall{" "}
                            <Info text="Hindsight sum of positive hourly errors. This is not a purchase volume: demand, prices and other generation are outside this pilot." />
                          </span>
                          <strong>
                            {number(day?.shortfallMwh)} <small>MWh</small>
                          </strong>
                        </div>
                        <div className="summary-foot">
                          {day?.matchedHours}/24 matched hours · retrospective
                        </div>
                      </section>
                    </div>
                  </>
                )}
                {tab === "performance" && <AccuracyView data={data} />}
                {tab === "method" && <MethodView data={data} />}
                <footer className="page-footer">
                  <span>Elexon · WINDFOR + FUELHH</span>
                  <span>Hourly resolution · UTC</span>
                </footer>
              </>
            )
          )}
        </main>
      </div>
      {help && (
        <div className="modal-backdrop" onClick={() => setHelp(false)}>
          <section
            className="help-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Workspace help"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close-modal icon-button"
              aria-label="Close help"
              onClick={() => setHelp(false)}
            >
              <X size={20} />
            </button>
            <Wind size={30} />
            <h2>Using Windwise</h2>
            <p>
              Choose decision dates and a cutoff. The outlook shows the forecast
              available for next-day delivery.
            </p>
            <p>
              Actuals are retrospective. Review errors in Accuracy or download
              the selected hourly data as CSV.
            </p>
            <button
              className="button primary"
              autoFocus
              onClick={() => setHelp(false)}
            >
              Got it
              <ArrowRight size={16} />
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
