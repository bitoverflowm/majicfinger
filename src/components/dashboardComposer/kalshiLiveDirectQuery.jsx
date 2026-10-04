"use client";

import { KalshiLiveSeriesDiscoveryFields } from "@/components/connectData/kalshiLive/KalshiLiveSeriesDiscoveryFields";
import { KalshiLiveMarketPicker } from "@/components/dashboardComposer/kalshiLiveMarketPicker";
import { KALSHI_LIVE_CANDLESTICK_PERIOD_OPTIONS } from "@/lib/kalshiLive/candlesticksColumns";
import { cn } from "@/lib/utils";

function pad(value) {
  return String(value).padStart(2, "0");
}

function unixToInput(unix) {
  const date = new Date(Number(unix) * 1000);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function inputToUnix(value) {
  const time = Date.parse(value);
  return Number.isFinite(time) ? Math.floor(time / 1000) : null;
}

function RangeFields({ query, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="block text-[11px] text-muted-foreground">
        Start
        <input
          type="datetime-local"
          value={unixToInput(query.minTs)}
          onChange={(event) => {
            const minTs = inputToUnix(event.target.value);
            if (minTs != null) onChange({ ...query, minTs });
          }}
          className="mt-1 h-9 w-full rounded-lg border border-border/70 bg-background px-2 text-[12px] text-foreground"
        />
      </label>
      <label className="block text-[11px] text-muted-foreground">
        End
        <input
          type="datetime-local"
          value={unixToInput(query.maxTs)}
          onChange={(event) => {
            const maxTs = inputToUnix(event.target.value);
            if (maxTs != null) onChange({ ...query, maxTs });
          }}
          className="mt-1 h-9 w-full rounded-lg border border-border/70 bg-background px-2 text-[12px] text-foreground"
        />
      </label>
    </div>
  );
}

function ModeSwitch({ value, onChange, options }) {
  return (
    <div className="flex rounded-lg bg-muted/60 p-0.5">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={cn(
            "flex-1 rounded-md px-2 py-1 text-[11px] font-medium",
            value === option.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Query controls for a Kalshi Live market endpoint pulled on its own.
 * The markets join stays on the Markets endpoint.
 */
export function KalshiLiveDirectQuery({ tableId, picks, onAdd, onRemove, query, onChange }) {
  if (tableId === "series") {
    return (
      <div className="space-y-3">
        <ModeSwitch
          value={query.mode}
          onChange={(mode) => onChange({ ...query, mode })}
          options={[
            { id: "tickers", label: "Specific series" },
            { id: "discover", label: "Discover" },
          ]}
        />
        {query.mode === "discover" ? (
          <KalshiLiveSeriesDiscoveryFields
            category={query.category}
            onCategoryChange={(category) => onChange({ ...query, category, tag: "" })}
            tag={query.tag}
            onTagChange={(tag) => onChange({ ...query, tag })}
            includeProductMetadata={query.includeProductMetadata}
            onIncludeProductMetadataChange={(includeProductMetadata) => onChange({ ...query, includeProductMetadata })}
            minUpdatedTs={query.minUpdatedTs}
            onMinUpdatedTsChange={(minUpdatedTs) => onChange({ ...query, minUpdatedTs })}
          />
        ) : (
          <>
            <KalshiLiveMarketPicker intent="series" picks={picks} onAdd={onAdd} onRemove={onRemove} />
            <ModeSwitch
              value={query.sheetMode}
              onChange={(sheetMode) => onChange({ ...query, sheetMode })}
              options={[
                { id: "combined", label: "One sheet" },
                { id: "per_series", label: "Sheet per series" },
              ]}
            />
          </>
        )}
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          This pulls series on their own. It does not open the markets inside a series. That search stays on Markets.
        </p>
      </div>
    );
  }

  const noun = tableId === "orderbook" ? "order book" : tableId === "candlesticks" ? "candlesticks" : "trades";
  const article = tableId === "orderbook" ? "an" : "a";
  return (
    <div className="space-y-3">
      <KalshiLiveMarketPicker picks={picks} onAdd={onAdd} onRemove={onRemove} />
      {tableId === "orderbook" ? (
        <label className="block text-[11px] text-muted-foreground">
          Depth
          <input
            type="number"
            min={0}
            max={100}
            value={query.depth}
            onChange={(event) => onChange({ ...query, depth: event.target.value })}
            className="mt-1 h-9 w-full rounded-lg border border-border/70 bg-background px-2 text-[12px] text-foreground"
          />
        </label>
      ) : (
        <RangeFields query={query} onChange={onChange} />
      )}
      {tableId === "candlesticks" ? (
        <label className="block text-[11px] text-muted-foreground">
          Period
          <select
            value={String(query.period)}
            onChange={(event) => onChange({ ...query, period: Number(event.target.value) })}
            className="mt-1 h-9 w-full rounded-lg border border-border/70 bg-background px-2 text-[12px] text-foreground"
          >
            {KALSHI_LIVE_CANDLESTICK_PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        This is {article} {noun} pull for the markets you add. Joining {noun} from a markets search stays on the Markets endpoint.
      </p>
    </div>
  );
}
