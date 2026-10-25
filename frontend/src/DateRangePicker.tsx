import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { DayPicker, type DateRange } from "@daypicker/react";
import { CalendarDays, ChevronDown, ArrowRight, X } from "lucide-react";
import { addDay, shortDate } from "./shared";
import "@daypicker/react/style.css";

const FIRST_DAY = "2026-01-01";
const LAST_DAY = "2026-01-31";
// Calendar dates stay in UTC, independently of the viewer's browser time zone.
const toDate = (value: string) => new Date(`${value}T00:00:00Z`);
const toKey = (value: Date) => value.toISOString().slice(0, 10);
const PRESETS = [
  { label: "Full month", from: FIRST_DAY, to: LAST_DAY },
  { label: "1–15 Jan", from: FIRST_DAY, to: "2026-01-15" },
  { label: "16–31 Jan", from: "2026-01-16", to: LAST_DAY },
];

export function DateRangePicker({
  from,
  to,
  onApply,
}: {
  from: string;
  to: string;
  onApply: (from: string, to: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange>({
    from: toDate(from),
    to: toDate(to),
  });
  const draftFrom = draft.from ? toKey(draft.from) : undefined;
  const draftTo = draft.to ? toKey(draft.to) : undefined;
  const complete = Boolean(draftFrom && draftTo);
  const dayCount = complete
    ? Math.round((draft.to!.getTime() - draft.from!.getTime()) / 86400000) + 1
    : null;

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setDraft({ from: toDate(from), to: toDate(to) });
        }
        setOpen(next);
      }}
    >
      <Popover.Trigger asChild>
        <button
          className="range-trigger"
          aria-label={`Decision dates: ${shortDate(from)} to ${shortDate(to)} 2026`}
        >
          <CalendarDays className="control-icon" size={19} aria-hidden="true" />
          <span className="control-body">
            <span className="control-label">Decision dates</span>
            <span className="control-value">
              <span>{shortDate(from)}</span>
              <ArrowRight size={13} aria-hidden="true" />
              <span>{shortDate(to)} 2026</span>
            </span>
          </span>
          <ChevronDown
            className="control-chevron"
            size={15}
            aria-hidden="true"
          />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="range-popover"
          align="start"
          sideOffset={9}
          collisionPadding={12}
          aria-label="Choose decision date range"
        >
          <div className="range-popover-header">
            <div>
              <h2>Decision dates</h2>
              <p>Available 1–31 January 2026</p>
            </div>
            <Popover.Close className="icon-button" aria-label="Close calendar">
              <X size={17} />
            </Popover.Close>
          </div>
          <div className="range-presets" aria-label="Date range shortcuts">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                aria-pressed={
                  draftFrom === preset.from && draftTo === preset.to
                }
                onClick={() => {
                  setDraft({
                    from: toDate(preset.from),
                    to: toDate(preset.to),
                  });
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="range-endpoints" aria-live="polite">
            <div>
              <span>Start</span>
              <strong>
                {draftFrom ? shortDate(draftFrom) : "Select date"}
              </strong>
            </div>
            <ArrowRight size={14} aria-hidden="true" />
            <div>
              <span>End</span>
              <strong>{draftTo ? shortDate(draftTo) : "Select date"}</strong>
            </div>
          </div>
          <DayPicker
            className="range-calendar"
            mode="range"
            required
            selected={draft}
            resetOnSelect
            onSelect={setDraft}
            timeZone="UTC"
            defaultMonth={toDate(FIRST_DAY)}
            startMonth={toDate(FIRST_DAY)}
            endMonth={toDate(LAST_DAY)}
            hideNavigation
            disabled={{ before: toDate(FIRST_DAY), after: toDate(LAST_DAY) }}
            excludeDisabled
            weekStartsOn={1}
            showOutsideDays
            autoFocus
          />
          <div className="range-selection-note" role="status">
            {complete ? (
              <>
                {dayCount} decision {dayCount === 1 ? "day" : "days"} · delivery{" "}
                {shortDate(addDay(draftFrom!, 1))}
                {draftTo !== draftFrom && (
                  <>–{shortDate(addDay(draftTo!, 1))}</>
                )}
              </>
            ) : (
              "Choose the end date to complete your range."
            )}
          </div>
          <div className="range-actions">
            <Popover.Close className="button calendar-cancel">
              Cancel
            </Popover.Close>
            <button
              className="button primary"
              disabled={!complete}
              onClick={() => {
                if (!draftFrom || !draftTo) return;
                onApply(draftFrom, draftTo);
                setOpen(false);
              }}
            >
              Apply dates
              <ArrowRight size={14} />
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
