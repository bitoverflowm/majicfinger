"use client";

import { MarketTickerSearch } from "@/components/connectData/MarketTickerSearch";
import { KalshiLiveSeriesDiscoveryFields } from "@/components/connectData/kalshiLive/KalshiLiveSeriesDiscoveryFields";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useMyStateV2 } from "@/context/stateContextV2";
import { kalshiLiveSeriesWantsIncludeVolume } from "@/lib/kalshiLive/seriesColumns";
import { cn } from "@/lib/utils";

/**
 * Series search with optional discovery mode (GET /series list filters).
 *
 * @param {{
 *   value: string;
 *   onChange: (value: string) => void;
 *   className?: string;
 *   disabled?: boolean;
 * }} props
 */
export function KalshiLiveSeriesTickersField({ value, onChange, className, disabled }) {
  const ctx = useMyStateV2() ?? {};
  const {
    setConnectKalshiLiveSeriesTickerMeta,
    connectKalshiLiveSeriesDiscoveryMode = false,
    setConnectKalshiLiveSeriesDiscoveryMode,
    connectKalshiLiveSeriesDiscoveryCategory = "",
    setConnectKalshiLiveSeriesDiscoveryCategory,
    connectKalshiLiveSeriesDiscoveryTag = "",
    setConnectKalshiLiveSeriesDiscoveryTag,
    connectKalshiLiveSeriesDiscoveryIncludeProductMetadata = false,
    setConnectKalshiLiveSeriesDiscoveryIncludeProductMetadata,
    connectKalshiLiveSeriesDiscoveryMinUpdatedTs = "",
    setConnectKalshiLiveSeriesDiscoveryMinUpdatedTs,
    connectKalshiLiveColumnSelections = {},
  } = ctx;

  const includeVolumeFromColumns = kalshiLiveSeriesWantsIncludeVolume(
    connectKalshiLiveColumnSelections?.series,
  );

  return (
    <div className={cn("space-y-2", className)}>
      <h2 className="text-xs font-semibold tracking-tight text-foreground">
        {connectKalshiLiveSeriesDiscoveryMode
          ? "Discover series by category"
          : "Add series tickers using the search below"}
      </h2>
      <p className="text-[11px] leading-snug text-muted-foreground">
        {connectKalshiLiveSeriesDiscoveryMode
          ? "Browse Kalshi’s series list with category and tag filters. Results always land in one sheet."
          : "Search for series only (markets are hidden). You can pull multiple series at once — choose one sheet or a sheet per series below."}
      </p>

      <div className="flex items-center gap-2">
        <Label htmlFor="series-discovery-mode" className="text-[11px] font-medium text-foreground">
          Toggle discovery mode
        </Label>
        <Switch
          id="series-discovery-mode"
          checked={!!connectKalshiLiveSeriesDiscoveryMode}
          disabled={disabled}
          onCheckedChange={(checked) => setConnectKalshiLiveSeriesDiscoveryMode?.(!!checked)}
        />
      </div>

      <div className="space-y-2 rounded-lg bg-muted/10 p-3">
        {connectKalshiLiveSeriesDiscoveryMode ? (
          <KalshiLiveSeriesDiscoveryFields
            category={connectKalshiLiveSeriesDiscoveryCategory}
            onCategoryChange={(v) => setConnectKalshiLiveSeriesDiscoveryCategory?.(v)}
            tag={connectKalshiLiveSeriesDiscoveryTag}
            onTagChange={(v) => setConnectKalshiLiveSeriesDiscoveryTag?.(v)}
            includeProductMetadata={!!connectKalshiLiveSeriesDiscoveryIncludeProductMetadata}
            onIncludeProductMetadataChange={(v) =>
              setConnectKalshiLiveSeriesDiscoveryIncludeProductMetadata?.(v)
            }
            minUpdatedTs={
              connectKalshiLiveSeriesDiscoveryMinUpdatedTs === "" ||
              connectKalshiLiveSeriesDiscoveryMinUpdatedTs == null
                ? ""
                : Number(connectKalshiLiveSeriesDiscoveryMinUpdatedTs)
            }
            onMinUpdatedTsChange={(v) => setConnectKalshiLiveSeriesDiscoveryMinUpdatedTs?.(v)}
            includeVolumeFromColumns={includeVolumeFromColumns}
            disabled={disabled}
          />
        ) : (
          <MarketTickerSearch
            value={value}
            onChange={onChange}
            disabled={disabled}
            dataSource="live"
            searchScope="series"
            showCutoffNotes={false}
            onSelectionsChange={(selections) => {
              const next = {};
              for (const s of selections || []) {
                const ticker = String(s?.ticker || "").trim().toUpperCase();
                if (!ticker) continue;
                next[ticker] = String(s?.title || ticker).trim() || ticker;
              }
              setConnectKalshiLiveSeriesTickerMeta?.(next);
            }}
          />
        )}
      </div>
    </div>
  );
}
