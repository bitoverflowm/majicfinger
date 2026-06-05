"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  clampCardGridRowLimit,
  formatCardGridTags,
  getCardGridFieldValue,
  looksLikeImageUrl,
} from "@/lib/dashboardCardGrid";
import {
  getCardGridFieldEditorClasses,
  getCardGridFieldEditorStyle,
  getCardGridFieldPublicClassName,
  getCardGridFieldPublicStyle,
  getCardGridSectionHeadingEditorClasses,
  getCardGridSectionHeadingEditorStyle,
  getCardGridSectionHeadingPublicClassName,
  getCardGridSectionHeadingPublicStyle,
  getCardGridSectionSubheadingEditorClasses,
  getCardGridSectionSubheadingEditorStyle,
  getCardGridSectionSubheadingPublicClassName,
  getCardGridSectionSubheadingPublicStyle,
} from "@/lib/dashboardCardGridTheme";

const TAG_STYLES = [
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
  "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
];

function FieldText({ row, field, value, editable, onFormatFocus }) {
  if (!value && !editable) return null;
  const className = editable
    ? cn(
        "w-full min-w-0 border-0 bg-transparent p-0 shadow-none outline-none",
        "text-foreground placeholder:text-muted-foreground/80",
        "focus:outline-none focus-visible:outline-none focus-visible:ring-0",
        getCardGridFieldEditorClasses(row, field),
      )
    : cn(getCardGridFieldPublicClassName(row, field));
  const style = editable
    ? getCardGridFieldEditorStyle(row, field)
    : getCardGridFieldPublicStyle(row, field);

  if (editable) {
    return (
      <span
        role="textbox"
        tabIndex={0}
        className={cn(className, "cursor-text")}
        style={style}
        onClick={(e) => e.stopPropagation()}
        onFocus={(e) => {
          e.stopPropagation();
          onFormatFocus?.({ type: "cardGridField", field });
        }}
      >
        {value || "—"}
      </span>
    );
  }

  if (field === "header") {
    return (
      <CardTitle className={className} style={style}>
        {value}
      </CardTitle>
    );
  }
  if (field === "subheader") {
    return (
      <CardDescription className={className} style={style}>
        {value}
      </CardDescription>
    );
  }
  if (field === "value") {
    return (
      <p className={cn("mt-1", className)} style={style}>
        {value}
      </p>
    );
  }
  return (
    <span className={className} style={style}>
      {value}
    </span>
  );
}

function DataCard({ row, rowData, rankIndex, editable, onFormatFocus }) {
  const fields = row?.fields || {};
  const imageVal = getCardGridFieldValue(rowData, "image", fields, rankIndex);
  const imageUrl = looksLikeImageUrl(imageVal) ? String(imageVal).trim() : "";
  const showImage = fields?.image?.visible !== false && imageUrl;
  const rankVal = getCardGridFieldValue(rowData, "rank", fields, rankIndex);
  const headerVal = String(getCardGridFieldValue(rowData, "header", fields, rankIndex) ?? "");
  const subheaderVal = String(getCardGridFieldValue(rowData, "subheader", fields, rankIndex) ?? "");
  const valueVal = String(getCardGridFieldValue(rowData, "value", fields, rankIndex) ?? "");
  const tagList =
    fields?.tags?.visible !== false
      ? formatCardGridTags(getCardGridFieldValue(rowData, "tags", fields, rankIndex))
      : [];

  return (
    <Card className="flex h-full min-w-0 flex-col overflow-hidden">
      {showImage ? (
        <div className="relative aspect-[16/9] w-full overflow-hidden border-b bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={headerVal || "Card image"}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      ) : null}
      <CardHeader className="space-y-1.5 p-4 pb-2">
        {rankVal ? (
          <FieldText
            row={row}
            field="rank"
            value={`#${rankVal}`}
            editable={editable}
            onFormatFocus={onFormatFocus}
          />
        ) : null}
        {headerVal || editable ? (
          <FieldText
            row={row}
            field="header"
            value={headerVal}
            editable={editable}
            onFormatFocus={onFormatFocus}
          />
        ) : null}
        {subheaderVal || editable ? (
          <FieldText
            row={row}
            field="subheader"
            value={subheaderVal}
            editable={editable}
            onFormatFocus={onFormatFocus}
          />
        ) : null}
      </CardHeader>
      {(tagList.length > 0 || valueVal) && (
        <CardContent className="flex flex-1 flex-col gap-2 p-4 pt-0">
          {tagList.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {tagList.slice(0, 4).map((tag, i) => (
                <Badge
                  key={`${tag}-${i}`}
                  variant="secondary"
                  className={cn("border text-[10px]", TAG_STYLES[i % TAG_STYLES.length])}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}
          {valueVal ? (
            <FieldText
              row={row}
              field="value"
              value={valueVal}
              editable={editable}
              onFormatFocus={onFormatFocus}
            />
          ) : null}
        </CardContent>
      )}
    </Card>
  );
}

/**
 * @param {{
 *   row: object;
 *   dataRows?: object[];
 *   editable?: boolean;
 *   selected?: boolean;
 *   onSelect?: () => void;
 *   onUpdateRow?: (fn: (r: object) => object) => void;
 *   onFormatFocus?: (target: object) => void;
 * }} props
 */
export function DashboardCardGridSection({
  row,
  dataRows = [],
  editable = false,
  selected = false,
  onSelect,
  onUpdateRow,
  onFormatFocus,
}) {
  const limit = clampCardGridRowLimit(row?.rowLimit);
  const displayRows = Array.isArray(dataRows) ? dataRows.slice(0, limit) : [];
  const sheetMissing = editable && !row?.sheetId;

  const sectionHeading = editable ? (
    <input
      type="text"
      aria-label="Card section heading"
      autoComplete="off"
      spellCheck={false}
      value={row.h2 ?? ""}
      placeholder="Section heading"
      onChange={(e) => onUpdateRow?.((r) => ({ ...r, h2: e.target.value }))}
      onClick={(e) => e.stopPropagation()}
      onFocus={(e) => {
        e.stopPropagation();
        onFormatFocus?.({ type: "cardGridSectionHeading" });
      }}
      style={getCardGridSectionHeadingEditorStyle(row)}
      className={cn(
        "w-full min-w-0 cursor-text border-0 bg-transparent p-0 shadow-none outline-none",
        "tracking-tight text-foreground placeholder:text-muted-foreground/80",
        "focus:outline-none focus-visible:outline-none focus-visible:ring-0",
        getCardGridSectionHeadingEditorClasses(row),
      )}
    />
  ) : row.h2?.trim() ? (
    <h2
      className={getCardGridSectionHeadingPublicClassName(row)}
      style={getCardGridSectionHeadingPublicStyle(row)}
    >
      {row.h2}
    </h2>
  ) : null;

  const sectionSubheading = editable ? (
    <Textarea
      aria-label="Card section subheading"
      autoComplete="off"
      spellCheck={false}
      rows={2}
      value={row.caption ?? ""}
      placeholder="Section subheading"
      onChange={(e) => onUpdateRow?.((r) => ({ ...r, caption: e.target.value }))}
      onClick={(e) => e.stopPropagation()}
      onFocus={(e) => {
        e.stopPropagation();
        onFormatFocus?.({ type: "cardGridSectionSubheading" });
      }}
      style={getCardGridSectionSubheadingEditorStyle(row)}
      className={cn(
        "!min-h-0 overflow-hidden",
        "w-full min-w-0 cursor-text resize-y border-0 bg-transparent p-0 shadow-none outline-none",
        "text-foreground placeholder:text-muted-foreground/80",
        "focus:outline-none focus-visible:outline-none focus-visible:ring-0",
        getCardGridSectionSubheadingEditorClasses(row),
      )}
    />
  ) : row.caption?.trim() ? (
    <p
      className={getCardGridSectionSubheadingPublicClassName(row)}
      style={getCardGridSectionSubheadingPublicStyle(row)}
    >
      {row.caption}
    </p>
  ) : null;

  return (
    <div
      role={editable ? "button" : undefined}
      tabIndex={editable ? 0 : undefined}
      onClick={editable ? onSelect : undefined}
      onKeyDown={
        editable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onSelect?.();
            }
          : undefined
      }
      className={cn(
        "space-y-4 rounded-lg py-1 outline-none transition-colors",
        editable && selected && "ring-1 ring-primary/30",
        editable && "cursor-pointer",
      )}
    >
      {(sectionHeading || sectionSubheading) && (
        <div className="space-y-1">
          {sectionHeading}
          {sectionSubheading}
        </div>
      )}

      {sheetMissing ? (
        <div className="flex min-h-[120px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          Select a table in the bottom bar to populate cards
        </div>
      ) : displayRows.length === 0 ? (
        <div className="flex min-h-[120px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          No rows in the selected table
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {displayRows.map((rowData, i) => (
            <DataCard
              key={`card-${i}`}
              row={row}
              rowData={rowData}
              rankIndex={i}
              editable={editable}
              onFormatFocus={(partial) =>
                onFormatFocus?.({ ...partial, rowId: row.id })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
