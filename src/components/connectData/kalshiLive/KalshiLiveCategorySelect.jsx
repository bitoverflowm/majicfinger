"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  KALSHI_LIVE_CATEGORY_OTHER,
  KALSHI_LIVE_SERIES_CATEGORY_OPTIONS,
} from "@/lib/kalshiLive/kalshiLiveCategories";

/**
 * Category Where value — preset list or Other + custom text.
 *
 * @param {{
 *   value: string;
 *   categoryOtherText?: string;
 *   onChange: (patch: { value?: string; categoryOtherText?: string }) => void;
 *   className?: string;
 * }} props
 */
export function KalshiLiveCategorySelect({ value, categoryOtherText = "", onChange, className }) {
  const selected = String(value ?? "").trim() || "__pick__";
  const isOther = selected === KALSHI_LIVE_CATEGORY_OTHER;

  return (
    <div className={className}>
      <Select
        value={selected}
        onValueChange={(v) => {
          if (v === "__pick__") return;
          onChange({
            value: v,
            categoryOtherText: v === KALSHI_LIVE_CATEGORY_OTHER ? categoryOtherText : "",
          });
        }}
      >
        <SelectTrigger className="h-7 min-w-[10rem] flex-1 text-[11px]">
          <SelectValue placeholder="Select category" />
        </SelectTrigger>
        <SelectContent className="max-h-[min(20rem,50vh)]">
          {KALSHI_LIVE_SERIES_CATEGORY_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">
              <span className="font-medium">{opt.label}</span>
            </SelectItem>
          ))}
          <SelectItem value={KALSHI_LIVE_CATEGORY_OTHER} className="text-xs font-medium">
            Other…
          </SelectItem>
        </SelectContent>
      </Select>
      {isOther ? (
        <Input
          className="mt-1.5 h-7 text-[11px]"
          placeholder="Category text, or leave blank for non-standard categories"
          value={categoryOtherText}
          onChange={(e) => onChange({ categoryOtherText: e.target.value })}
        />
      ) : null}
    </div>
  );
}
