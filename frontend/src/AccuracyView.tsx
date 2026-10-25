import type { Report } from "./types";
import { number, shortDate, timeOf, HourTooltip } from "./shared";
import { ShieldCheck } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

export function AccuracyView({ data }: { data: Report }) {
  const summary = data.summary;
  return (
    <>
      <div className="performance-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Forecast vs actual</h2>
              <p>Hourly pairs · dashed line = perfect forecast</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={310}>
            <ScatterChart
              margin={{
                top: 15,
                right: 25,
                bottom: 25,
                left: 12,
              }}
            >
              <CartesianGrid strokeDasharray="3 5" stroke="#e7ece9" />
              <XAxis
                type="number"
                dataKey="forecastMw"
                name="Forecast"
                unit=" MW"
                tick={{ fontSize: 10 }}
                domain={[0, "dataMax"]}
                label={{
                  value: "Forecast (MW)",
                  position: "bottom",
                  offset: 5,
                  fontSize: 11,
                }}
              />
              <YAxis
                type="number"
                dataKey="actualMw"
                name="Actual"
                unit=" MW"
                tick={{ fontSize: 10 }}
                domain={[0, "dataMax"]}
                width={72}
              />
              <ZAxis range={[17, 17]} />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={<HourTooltip />}
              />
              <ReferenceLine
                segment={[
                  { x: 0, y: 0 },
                  { x: 25000, y: 25000 },
                ]}
                stroke="#a1aaa5"
                strokeDasharray="5 5"
                ifOverflow="extendDomain"
              />
              <Scatter
                data={data.rows.filter((r) => r.errorMw != null)}
                fill="#278c78"
                fillOpacity={0.5}
                isAnimationActive={false}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Error by delivery hour</h2>
              <p>Mean absolute error · MW</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={310}>
            <BarChart
              data={data.hourly}
              margin={{ top: 15, right: 20, left: 0, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 5" vertical={false} />
              <XAxis
                dataKey="hour"
                tickFormatter={(h) => String(h).padStart(2, "0") + ":00"}
                interval={5}
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                width={55}
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                labelFormatter={(v) => String(v).padStart(2, "0") + ":00 UTC"}
                formatter={(v) => [
                  number(Number(v)) + " MW",
                  "Mean absolute error",
                ]}
              />
              <Bar
                dataKey="maeMw"
                fill="#d4ab7f"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>
      <section className="panel table-panel">
        <div className="panel-heading">
          <div>
            <h2>Largest hourly misses</h2>
            <p>Error = forecast − actual · positive means wind shortfall</p>
          </div>
          <span className="pill">HINDSIGHT</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Delivery hour · UTC</th>
                <th>Forecast issue · UTC</th>
                <th>Forecast · MW</th>
                <th>Actual · MW</th>
                <th>Error · MW</th>
              </tr>
            </thead>
            <tbody>
              {data.worstHours.map((r) => (
                <tr key={r.startTime}>
                  <td>
                    {shortDate(r.startTime.slice(0, 10))} ·{" "}
                    {timeOf(r.startTime)}
                  </td>
                  <td>
                    {r.publishTime
                      ? `${shortDate(r.publishTime.slice(0, 10))} · ${timeOf(r.publishTime)}`
                      : "—"}
                  </td>
                  <td>{number(r.forecastMw)}</td>
                  <td>{number(r.actualMw, 1)}</td>
                  <td>
                    <span
                      className={
                        r.errorMw! > 0 ? "error-positive" : "error-negative"
                      }
                    >
                      {r.errorMw! > 0 ? "+" : ""}
                      {number(r.errorMw, 1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="notice">
        <ShieldCheck size={18} />
        <p>
          90th percentile absolute error:{" "}
          <strong>{number(summary.p90AbsoluteErrorMw)} MW</strong>. Historical
          sample, not a prediction interval.
        </p>
      </div>
    </>
  );
}
