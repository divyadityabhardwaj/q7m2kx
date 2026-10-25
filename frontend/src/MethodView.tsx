import type { Report } from "./types";
import { number } from "./shared";
import { ShieldCheck, ArrowUpRight } from "lucide-react";

export function MethodView({ data }: { data: Report }) {
  return (
    <section className="panel method-panel">
      <h2>How the analysis works</h2>
      <p className="method-intro">
        Elexon national wind data · January 2026 decisions
      </p>
      <div className="method-grid">
        <article>
          <span className="step-number">01</span>
          <h3>Define the decision</h3>
          <p>
            Decisions: 1–31 January. Delivery: the following day, 2 January–1
            February. The adjustable 09:00 UTC default is an illustrative
            cutoff, not an exchange deadline.
          </p>
        </article>
        <article>
          <span className="step-number">02</span>
          <h3>Select without hindsight</h3>
          <p>
            For each target hour, select the latest WINDFOR issue published at
            or before the cutoff. Later issues are excluded. Inspect publication
            times in the chart or CSV.
          </p>
        </article>
        <article>
          <span className="step-number">03</span>
          <h3>Compare equal intervals</h3>
          <p>
            Average both FUELHH WIND half-hours to match each hourly WINDFOR
            target. Missing values stay blank and are excluded from paired
            metrics. No interpolation.
          </p>
        </article>
        <article>
          <span className="step-number">04</span>
          <h3>Interpret the result</h3>
          <p>
            Error = forecast − actual. Positive means wind shortfall. Hourly
            average MW × 1 hour = MWh. Actuals are retrospective and may be
            revised.
          </p>
        </article>
      </div>
      <div className="source-box">
        <div>
          <h3>Real source data. A reproducible snapshot.</h3>
          <p>
            {number(data.provenance.forecastRows)} forecast records ·{" "}
            {number(data.provenance.actualRows)} half-hour actuals
          </p>
          <p>
            Retrieved{" "}
            {new Date(data.provenance.fetchedAt).toLocaleString("en-GB", {
              timeZone: "UTC",
            })}{" "}
            UTC. The deployed app reads a committed snapshot and makes no
            runtime Elexon requests.
          </p>
          <div className="source-links">
            <a
              href="https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream"
              target="_blank"
              rel="noreferrer"
            >
              WINDFOR documentation
              <ArrowUpRight size={14} />
            </a>
            <a
              href="https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream"
              target="_blank"
              rel="noreferrer"
            >
              FUELHH documentation
              <ArrowUpRight size={14} />
            </a>
          </div>
          <small className="hash">SHA-256 {data.provenance.sha256}</small>
        </div>
        <ShieldCheck size={32} />
      </div>
      <div className="limits">
        <h3>What this pilot can support</h3>
        <p>
          This pilot evaluates national wind forecasts. Purchase volumes need
          customer demand, contracted supply and prices, which are outside
          scope.
        </p>
      </div>
    </section>
  );
}
