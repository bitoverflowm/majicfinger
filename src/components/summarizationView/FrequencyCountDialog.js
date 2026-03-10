'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useMyStateV2 } from '@/context/stateContextV2';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const DATE_LIKE = /^\d{4}-\d{2}-\d{2}/;

function inferColumnType(colKey, data, dataTypes) {
  if (dataTypes?.[colKey]) {
    const t = dataTypes[colKey];
    if (t === 'number' || t === 'date') return t;
    return 'string';
  }
  if (!data?.length) return 'string';
  const v = data[0][colKey];
  if (v instanceof Date) return 'date';
  if (typeof v === 'number' && Number.isFinite(v)) return 'number';
  if (typeof v === 'string' && DATE_LIKE.test(v)) return 'date';
  const n = Number(v);
  if (v != null && v !== '' && !Number.isNaN(n) && Number.isFinite(n)) return 'number';
  return 'string';
}

function getDistinctValues(data, colKey) {
  const set = new Set();
  (data || []).forEach((row) => {
    const v = row[colKey];
    if (v != null && v !== '') set.add(String(v));
  });
  return Array.from(set).sort();
}

function getNumericRange(data, colKey) {
  const vals = (data || [])
    .map((r) => r[colKey])
    .filter((v) => v != null && v !== '' && !Number.isNaN(Number(v)))
    .map((v) => Number(v));
  if (vals.length === 0) return { min: 0, max: 100 };
  return { min: Math.min(...vals), max: Math.max(...vals) };
}

function getDateRange(data, colKey) {
  const vals = (data || [])
    .map((r) => r[colKey])
    .filter((v) => v != null && v !== '')
    .map((v) => (v instanceof Date ? v : new Date(v)))
    .filter((d) => !Number.isNaN(d.getTime()));
  if (vals.length === 0) return { min: new Date(), max: new Date() };
  return { min: new Date(Math.min(...vals.map((d) => d.getTime()))), max: new Date(Math.max(...vals.map((d) => d.getTime()))) };
}

function createBuckets(min, max, numBuckets) {
  const step = (max - min) / numBuckets;
  const buckets = [];
  for (let i = 0; i < numBuckets; i++) {
    const low = min + i * step;
    const high = i === numBuckets - 1 ? max : min + (i + 1) * step;
    buckets.push({
      label: i === numBuckets - 1 ? `${low.toFixed(1)} to ${high}` : `${low.toFixed(1)} to <${high.toFixed(1)}`,
      low,
      high,
      includeHigh: i === numBuckets - 1,
    });
  }
  return buckets;
}

function createDateBuckets(minDate, maxDate, numBuckets) {
  const min = minDate.getTime();
  const max = maxDate.getTime();
  const step = (max - min) / numBuckets;
  const buckets = [];
  for (let i = 0; i < numBuckets; i++) {
    const low = new Date(min + i * step);
    const high = i === numBuckets - 1 ? new Date(max) : new Date(min + (i + 1) * step);
    buckets.push({
      label: `${low.toLocaleDateString()} to ${high.toLocaleDateString()}`,
      low: low.getTime(),
      high: high.getTime(),
      includeHigh: i === numBuckets - 1,
    });
  }
  return buckets;
}

function assignToBucket(value, buckets, isDate) {
  const v = isDate ? (value instanceof Date ? value.getTime() : new Date(value).getTime()) : Number(value);
  if (Number.isNaN(v)) return null;
  for (let i = 0; i < buckets.length; i++) {
    const b = buckets[i];
    if (v >= b.low && (b.includeHigh ? v <= b.high : v < b.high)) return b.label;
  }
  return null;
}

export function FrequencyCountDialog({ open, onOpenChange, onSave }) {
  const contextStateV2 = useMyStateV2();
  const connectedData = contextStateV2?.connectedData || [];
  const connectedCols = contextStateV2?.connectedCols || [];
  const dataTypes = contextStateV2?.dataTypes || {};

  const colKeys = useMemo(
    () => (connectedCols || []).map((c) => (c?.field ?? c)).filter(Boolean),
    [connectedCols]
  );

  const [selectedColumns, setSelectedColumns] = useState([]);
  const [columnConfigs, setColumnConfigs] = useState({});

  const addColumn = useCallback(() => {
    const next = colKeys.find((k) => !selectedColumns.includes(k));
    if (next) setSelectedColumns((p) => [...p, next]);
    else toast.info('All columns already added');
  }, [colKeys, selectedColumns]);

  const removeColumn = useCallback((col) => {
    setSelectedColumns((p) => p.filter((c) => c !== col));
    setColumnConfigs((p) => {
      const next = { ...p };
      delete next[col];
      return next;
    });
  }, []);

  const updateColumnConfig = useCallback((col, updates) => {
    setColumnConfigs((p) => ({ ...p, [col]: { ...(p[col] || {}), ...updates } }));
  }, []);

  const resultTable = useMemo(() => {
    if (!connectedData.length || selectedColumns.length === 0) return [];

    const rows = [];
    for (const col of selectedColumns) {
      const type = inferColumnType(col, connectedData, dataTypes);
      const config = columnConfigs[col] || {};

      if (type === 'boolean' || type === 'object' || type === 'array') {
        rows.push({ variable: col, value: '(Not suitable for frequency count)', count: 0, _skip: true });
        continue;
      }

      if (type === 'string') {
        const distinct = getDistinctValues(connectedData, col);
        const selected = config.selectedValues;
        const useAll = selected == null || (Array.isArray(selected) && selected.length === 0) || config.useAll;
        const toCount = useAll ? distinct : (selected || []).filter((v) => distinct.includes(v));

        const countMap = {};
        toCount.forEach((v) => (countMap[v] = 0));
        connectedData.forEach((row) => {
          const v = row[col] != null ? String(row[col]) : '';
          if (toCount.includes(v)) countMap[v]++;
        });

        toCount.forEach((v) => rows.push({ variable: col, value: v, count: countMap[v] || 0 }));
      } else if (type === 'number') {
        const { min, max } = getNumericRange(connectedData, col);
        const numBuckets = config.numBuckets ?? 4;
        const buckets = createBuckets(min, max, Math.max(1, numBuckets));

        const countMap = {};
        buckets.forEach((b) => (countMap[b.label] = 0));
        connectedData.forEach((row) => {
          const label = assignToBucket(row[col], buckets, false);
          if (label) countMap[label]++;
        });

        buckets.forEach((b) => rows.push({ variable: col, value: b.label, count: countMap[b.label] || 0 }));
      } else if (type === 'date') {
        const { min: minDate, max: maxDate } = getDateRange(connectedData, col);
        const numBuckets = config.numBuckets ?? 4;
        const buckets = createDateBuckets(minDate, maxDate, Math.max(1, numBuckets));

        const countMap = {};
        buckets.forEach((b) => (countMap[b.label] = 0));
        connectedData.forEach((row) => {
          const label = assignToBucket(row[col], buckets, true);
          if (label) countMap[label]++;
        });

        buckets.forEach((b) => rows.push({ variable: col, value: b.label, count: countMap[b.label] || 0 }));
      }
    }
    return rows.filter((r) => !r._skip);
  }, [connectedData, selectedColumns, columnConfigs, dataTypes]);

  const handleSave = useCallback(() => {
    if (resultTable.length === 0) {
      toast.error('No data to save. Add at least one column.');
      return;
    }
    const table = {
      id: `freq-${Date.now()}`,
      type: 'frequencyCount',
      title: `Frequency Count: ${selectedColumns.join(', ')}`,
      data: resultTable,
      config: { columns: selectedColumns, columnConfigs },
    };
    onSave(table);
    toast.success('Frequency count saved to Summarize drawer');
  }, [resultTable, selectedColumns, columnConfigs, onSave]);

  const handleClose = useCallback(() => {
    setSelectedColumns([]);
    setColumnConfigs({});
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : handleClose())}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Frequency Count</DialogTitle>
          <DialogDescription>
            Select columns to count frequencies. Categorical columns show distinct values; numerical and date columns support bucketing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Columns to count</Label>
            <Select onValueChange={(v) => v && setSelectedColumns((p) => (p.includes(v) ? p : [...p, v]))}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Add column" />
              </SelectTrigger>
              <SelectContent>
                {colKeys.map((k) => (
                  <SelectItem key={k} value={k}>
                    {k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={addColumn} className="gap-1">
              <Plus className="h-4 w-4" />
              Add column
            </Button>
          </div>

          {selectedColumns.map((col) => (
            <ColumnConfig
              key={col}
              col={col}
              data={connectedData}
              dataTypes={dataTypes}
              config={columnConfigs[col] || {}}
              onConfigChange={(updates) => updateColumnConfig(col, updates)}
              onRemove={() => removeColumn(col)}
            />
          ))}

          {resultTable.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm">Preview</Label>
              <div className="overflow-x-auto max-h-[250px] overflow-y-auto rounded border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Variable</TableHead>
                      <TableHead className="text-xs">Value</TableHead>
                      <TableHead className="text-xs">Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resultTable.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{row.variable}</TableCell>
                        <TableCell className="text-xs">{row.value}</TableCell>
                        <TableCell className="text-xs">{row.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={resultTable.length === 0}>
            Save to Summarize drawer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ColumnConfig({ col, data, dataTypes, config, onConfigChange, onRemove }) {
  const type = inferColumnType(col, data, dataTypes);

  if (type === 'boolean' || type === 'object' || type === 'array') {
    return (
      <div className="rounded border p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{col}</span>
          <Button variant="ghost" size="sm" className="h-7 text-destructive" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Frequency counts do not make sense for this column. {type === 'boolean' && 'Boolean columns have at most two values; consider using a contingency table instead.'}
          {type === 'object' && 'Object/structured data cannot be meaningfully counted as categories.'}
          {type === 'array' && 'Array data cannot be meaningfully counted as categories.'}
        </p>
      </div>
    );
  }

  if (type === 'string') {
    const distinct = getDistinctValues(data, col);
    const useAll = config.useAll !== false && (!config.selectedValues || config.selectedValues.length === 0);
    const selected = config.selectedValues || [];

    return (
      <div className="rounded border p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{col}</span>
          <Button variant="ghost" size="sm" className="h-7 text-destructive" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Categorical — {distinct.length} distinct values</p>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <Checkbox
              checked={useAll}
              onCheckedChange={(c) => {
                onConfigChange({ useAll: !!c, selectedValues: c ? [] : selected });
              }}
            />
            Count all
          </label>
        </div>
        {!useAll && (
          <div className="max-h-[120px] overflow-y-auto space-y-1">
            {distinct.slice(0, 50).map((v) => (
              <label key={v} className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox
                  checked={selected.includes(v)}
                  onCheckedChange={(c) => {
                    const next = c ? [...selected, v] : selected.filter((x) => x !== v);
                    onConfigChange({ selectedValues: next });
                  }}
                />
                <span className="truncate">{String(v).slice(0, 60)}{String(v).length > 60 ? '…' : ''}</span>
              </label>
            ))}
            {distinct.length > 50 && <p className="text-[10px] text-muted-foreground">+{distinct.length - 50} more</p>}
          </div>
        )}
      </div>
    );
  }

  if (type === 'number') {
    const { min, max } = getNumericRange(data, col);
    const numBuckets = config.numBuckets ?? 4;

    return (
      <div className="rounded border p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{col}</span>
          <Button variant="ghost" size="sm" className="h-7 text-destructive" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Numerical — range {min.toFixed(1)} to {max.toFixed(1)}
        </p>
        <div className="flex items-center gap-2">
          <Label className="text-xs">Number of buckets</Label>
          <Input
            type="number"
            min={1}
            max={50}
            value={numBuckets}
            onChange={(e) => onConfigChange({ numBuckets: Math.max(1, parseInt(e.target.value, 10) || 4) })}
            className="w-20 h-8"
          />
        </div>
      </div>
    );
  }

  if (type === 'date') {
    const { min, max } = getDateRange(data, col);
    const numBuckets = config.numBuckets ?? 4;

    return (
      <div className="rounded border p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{col}</span>
          <Button variant="ghost" size="sm" className="h-7 text-destructive" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Date — {min.toLocaleDateString()} to {max.toLocaleDateString()}
        </p>
        <div className="flex items-center gap-2">
          <Label className="text-xs">Number of buckets</Label>
          <Input
            type="number"
            min={1}
            max={50}
            value={numBuckets}
            onChange={(e) => onConfigChange({ numBuckets: Math.max(1, parseInt(e.target.value, 10) || 4) })}
            className="w-20 h-8"
          />
        </div>
      </div>
    );
  }

  return null;
}
