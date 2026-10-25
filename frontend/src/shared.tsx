import { CircleHelp } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import type { Row } from "./types";
export const number = (v: number | null | undefined, digits = 0) =>
  v == null
    ? "—"
    : new Intl.NumberFormat("en-GB", { maximumFractionDigits: digits }).format(
        v,
      );
export const shortDate = (d: string) =>
  new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
export const fullDate = (d: string) =>
  new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
export const timeOf = (d: string | null) => (d ? d.slice(11, 16) : "—");
export const addDay = (d: string, offset: number) => {
  const t = new Date(d + "T00:00:00Z");
  t.setUTCDate(t.getUTCDate() + offset);
  return t.toISOString().slice(0, 10);
};
export const colors = {
  forecast: "#1a8571",
  actual: "#6476c6",
  error: "#d58c53",
};
export function Info({ text }: { text: string }) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button className="info" aria-label={text} title="Show explanation">
          <CircleHelp size={14} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="info-popover"
          side="top"
          align="end"
          sideOffset={8}
          collisionPadding={12}
          aria-label="Explanation"
        >
          <p>{text}</p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function Stat({
  label,
  value,
  unit,
  accent = false,
  info,
}: {
  label: string;
  value: string;
  unit: string;
  detail?: string;
  accent?: boolean;
  info: string;
}) {
  return (
    <article className={"stat " + (accent ? "accent" : "")}>
      <div className="stat-label">
        {label}
        <Info text={info} />
      </div>
      <div className="stat-value">
        {value}
        <span>{unit}</span>
      </div>
    </article>
  );
}
export function HourTooltip({
  active,
  payload,
  showActual = true,
}: {
  active?: boolean;
  showActual?: boolean;
  payload?: { payload: Row }[];
}) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <strong>
        {r.startTime.slice(0, 10)} · {timeOf(r.startTime)} UTC
      </strong>
      <p>
        <i style={{ background: colors.forecast }} />
        Forecast <b>{number(r.forecastMw)} MW</b>
      </p>
      {showActual && (
        <>
          <p>
            <i style={{ background: colors.actual }} />
            Actual <b>{number(r.actualMw, 1)} MW</b>
          </p>
          <p>
            Error <b>{number(r.errorMw, 1)} MW</b>
          </p>
        </>
      )}
      <small>
        Published{" "}
        {r.publishTime?.replace("T", " ").replace("Z", " UTC") ?? "unavailable"}
        <br />
        Lead time {number(r.leadHours, 1)}h · issue age at cutoff{" "}
        {number(r.issueAgeHours, 1)}h
      </small>
    </div>
  );
}
