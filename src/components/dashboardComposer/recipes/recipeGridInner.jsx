"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DataEditor, GridCellKind } from "@glideapps/glide-data-grid";
import { useHtmlDarkClass } from "@/hooks/use-html-dark-class";
import { bodyFontFamily, glideThemeFor } from "@/components/dashboardComposer/glideTheme";

/** Read-only Glide sheet for recipe results. `columns` carry `{ id, title, width, format }`. */
export default function RecipeGridInner({ columns, records }) {
  const dark = useHtmlDarkClass();
  const frameRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [fontFamily] = useState(bodyFontFamily);
  const theme = useMemo(() => glideThemeFor(dark, fontFamily), [dark, fontFamily]);
  const gridColumns = useMemo(
    () => columns.map((column) => ({ id: column.id, title: column.title, width: column.width || 120 })),
    [columns],
  );

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return undefined;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);
      if (width <= 0 || height <= 0) return;
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const getCellContent = useCallback(
    ([col, row]) => {
      const column = columns[col];
      const raw = records[row]?.[column?.id];
      const text = column?.format ? column.format(raw) : raw == null ? "" : String(raw);
      return { kind: GridCellKind.Text, data: text, displayData: text, allowOverlay: false, readonly: true };
    },
    [columns, records],
  );

  return (
    <div ref={frameRef} className="min-h-0 flex-1 overflow-hidden">
      {size.width > 0 && size.height > 0 ? (
        <DataEditor
          width={size.width}
          height={size.height}
          columns={gridColumns}
          rows={records.length}
          getCellContent={getCellContent}
          rowMarkers="number"
          headerHeight={32}
          rowHeight={28}
          theme={theme}
          smoothScrollX
          smoothScrollY
          getCellsForSelection
        />
      ) : null}
    </div>
  );
}
