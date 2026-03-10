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
import { Download, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

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

export function ContingencyTableDialog({ open, onOpenChange, onSave }) {
  const contextStateV2 = useMyStateV2();
  const connectedData = contextStateV2?.connectedData || [];
  const connectedCols = contextStateV2?.connectedCols || [];
  const dataTypes = contextStateV2?.dataTypes || {};

  const colKeys = useMemo(
    () => (connectedCols || []).map((c) => (c?.field ?? c)).filter(Boolean),
    [connectedCols]
  );

  const [col1, setCol1] = useState('');
  const [col2, setCol2] = useState('');
  const [config1, setConfig1] = useState({});
  const [config2, setConfig2] = useState({});

  const type1 = inferColumnType(col1, connectedData, dataTypes);
  const type2 = inferColumnType(col2, connectedData, dataTypes);

  const categories1 = useMemo(() => {
    if (!col1 || !connectedData.length) return [];
    if (type1 === 'string') {
      const distinct = getDistinctValues(connectedData, col1);
      const useAll = config1.useAll !== false && (!config1.selectedValues || config1.selectedValues.length === 0);
      return useAll ? distinct : (config1.selectedValues || []).filter((v) => distinct.includes(v));
    }
    if (type1 === 'number') {
      const { min, max } = getNumericRange(connectedData, col1);
      const numBuckets = config1.numBuckets ?? 4;
      return createBuckets(min, max, Math.max(1, numBuckets)).map((b) => b.label);
    }
    if (type1 === 'date') {
      const { min, max } = getDateRange(connectedData, col1);
      const numBuckets = config1.numBuckets ?? 4;
      return createDateBuckets(min, max, Math.max(1, numBuckets)).map((b) => b.label);
    }
    return [];
  }, [col1, connectedData, type1, config1]);

  const categories2 = useMemo(() => {
    if (!col2 || !connectedData.length) return [];
    if (type2 === 'string') {
      const distinct = getDistinctValues(connectedData, col2);
      const useAll = config2.useAll !== false && (!config2.selectedValues || config2.selectedValues.length === 0);
      return useAll ? distinct : (config2.selectedValues || []).filter((v) => distinct.includes(v));
    }
    if (type2 === 'number') {
      const { min, max } = getNumericRange(connectedData, col2);
      const numBuckets = config2.numBuckets ?? 4;
      return createBuckets(min, max, Math.max(1, numBuckets)).map((b) => b.label);
    }
    if (type2 === 'date') {
      const { min, max } = getDateRange(connectedData, col2);
      const numBuckets = config2.numBuckets ?? 4;
      return createDateBuckets(min, max, Math.max(1, numBuckets)).map((b) => b.label);
    }
    return [];
  }, [col2, connectedData, type2, config2]);

  const getValue1 = useCallback(
    (row) => {
      if (!col1) return null;
      const v = row[col1];
      if (type1 === 'string') return v != null && v !== '' ? String(v) : null;
      if (type1 === 'number') {
        const { min, max } = getNumericRange(connectedData, col1);
        const buckets = createBuckets(min, max, Math.max(1, config1.numBuckets ?? 4));
        return assignToBucket(v, buckets, false);
      }
      if (type1 === 'date') {
        const { min, max } = getDateRange(connectedData, col1);
        const buckets = createDateBuckets(min, max, Math.max(1, config1.numBuckets ?? 4));
        return assignToBucket(v, buckets, true);
      }
      return null;
    },
    [col1, type1, connectedData, config1.numBuckets]
  );

  const getValue2 = useCallback(
    (row) => {
      if (!col2) return null;
      const v = row[col2];
      if (type2 === 'string') return v != null && v !== '' ? String(v) : null;
      if (type2 === 'number') {
        const { min, max } = getNumericRange(connectedData, col2);
        const buckets = createBuckets(min, max, Math.max(1, config2.numBuckets ?? 4));
        return assignToBucket(v, buckets, false);
      }
      if (type2 === 'date') {
        const { min, max } = getDateRange(connectedData, col2);
        const buckets = createDateBuckets(min, max, Math.max(1, config2.numBuckets ?? 4));
        return assignToBucket(v, buckets, true);
      }
      return null;
    },
    [col2, type2, connectedData, config2.numBuckets]
  );

  const contingencyData = useMemo(() => {
    if (!col1 || !col2 || !connectedData.length || categories1.length === 0 || categories2.length === 0) {
      return { matrix: {}, rowTotals: {}, colTotals: {}, grandTotal: 0, tableRows: [] };
    }

    const matrix = {};
    categories1.forEach((r) => {
      matrix[r] = {};
      categories2.forEach((c) => (matrix[r][c] = 0));
    });
    const rowTotals = {};
    const colTotals = {};
    categories1.forEach((r) => (rowTotals[r] = 0));
    categories2.forEach((c) => (colTotals[c] = 0));

    connectedData.forEach((row) => {
      const v1 = getValue1(row);
      const v2 = getValue2(row);
      if (categories1.includes(v1) && categories2.includes(v2)) {
        matrix[v1][v2]++;
        rowTotals[v1]++;
        colTotals[v2]++;
      }
    });

    const grandTotal = Object.values(rowTotals).reduce((a, b) => a + b, 0);

    const tableRows = categories1.map((r) => ({
      [col1]: r,
      ...Object.fromEntries(categories2.map((c) => [c, matrix[r][c]])),
      Total: rowTotals[r],
    }));
    tableRows.push({
      [col1]: 'Total',
      ...Object.fromEntries(categories2.map((c) => [c, colTotals[c]])),
      Total: grandTotal,
    });

    return { matrix, rowTotals, colTotals, grandTotal, tableRows };
  }, [col1, col2, connectedData, categories1, categories2, getValue1, getValue2]);

  const exportCSV = useCallback(() => {
    if (contingencyData.tableRows.length === 0) {
      toast.error('No data to export');
      return;
    }
    const cols = Object.keys(contingencyData.tableRows[0]);
    const escape = (v) => {
      const s = v == null ? '' : String(v);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const header = cols.map(escape).join(',');
    const rows = contingencyData.tableRows.map((row) => cols.map((c) => escape(row[c])).join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contingency-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded');
  }, [contingencyData.tableRows]);

  const exportJSON = useCallback(() => {
    if (contingencyData.tableRows.length === 0) {
      toast.error('No data to export');
      return;
    }
    const json = JSON.stringify(contingencyData.tableRows, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contingency-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('JSON downloaded');
  }, [contingencyData.tableRows]);

  const handleSave = useCallback(() => {
    if (contingencyData.tableRows.length === 0) {
      toast.error('Select two columns and configure categories first.');
      return;
    }
    const table = {
      id: `contingency-${Date.now()}`,
      type: 'contingencyTable',
      title: `Contingency: ${col1} × ${col2}`,
      data: contingencyData.tableRows,
      config: { col1, col2, config1, config2, categories1, categories2 },
    };
    onSave(table);
    toast.success('Contingency table saved to Summarize drawer');
  }, [contingencyData.tableRows, col1, col2, config1, config2, categories1, categories2, onSave]);

  const handleClose = useCallback(() => {
    setCol1('');
    setCol2('');
    setConfig1({});
    setConfig2({});
    onOpenChange(false);
  }, [onOpenChange]);

  const invalidType1 = type1 === 'boolean' || type1 === 'object' || type1 === 'array';
  const invalidType2 = type2 === 'boolean' || type2 === 'object' || type2 === 'array';

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : handleClose())}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Contingency Table</DialogTitle>
          <DialogDescription>
            Select two columns to create a summary table of counts across two categorical variables — useful for chi-squared tests or general categorical analysis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Column 1 (rows)</Label>
              <Select value={col1} onValueChange={setCol1}>
                <SelectTrigger>
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {colKeys.map((k) => (
                    <SelectItem key={k} value={k}>
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {col1 && (
                <ContingencyColumnConfig
                  col={col1}
                  data={connectedData}
                  dataTypes={dataTypes}
                  config={config1}
                  onConfigChange={setConfig1}
                  invalidType={invalidType1}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Column 2 (columns)</Label>
              <Select value={col2} onValueChange={setCol2}>
                <SelectTrigger>
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {colKeys.map((k) => (
                    <SelectItem key={k} value={k}>
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {col2 && (
                <ContingencyColumnConfig
                  col={col2}
                  data={connectedData}
                  dataTypes={dataTypes}
                  config={config2}
                  onConfigChange={setConfig2}
                  invalidType={invalidType2}
                />
              )}
            </div>
          </div>

          {invalidType1 && col1 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Column &quot;{col1}&quot; is not suitable for contingency analysis. {type1 === 'boolean' && 'Use a different column or convert to string.'}
              {(type1 === 'object' || type1 === 'array') && 'Structured data cannot be used in contingency tables.'}
            </p>
          )}
          {invalidType2 && col2 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Column &quot;{col2}&quot; is not suitable for contingency analysis. {type2 === 'boolean' && 'Use a different column or convert to string.'}
              {(type2 === 'object' || type2 === 'array') && 'Structured data cannot be used in contingency tables.'}
            </p>
          )}

          {contingencyData.tableRows.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm">Live preview</Label>
              <div className="overflow-x-auto max-h-[300px] overflow-y-auto rounded border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs font-semibold">{col1}</TableHead>
                      {categories2.map((c) => (
                        <TableHead key={c} className="text-xs">
                          {String(c).slice(0, 30)}{String(c).length > 30 ? '…' : ''}
                        </TableHead>
                      ))}
                      <TableHead className="text-xs font-semibold">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contingencyData.tableRows.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs font-medium">{row[col1]}</TableCell>
                        {categories2.map((c) => (
                          <TableCell key={c} className="text-xs">
                            {row[c]}
                          </TableCell>
                        ))}
                        <TableCell className="text-xs font-semibold">{row.Total}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <div className="flex gap-1 mr-auto">
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={contingencyData.tableRows.length === 0} className="gap-1">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={exportJSON} disabled={contingencyData.tableRows.length === 0} className="gap-1">
              <Download className="h-4 w-4" />
              Export JSON
            </Button>
          </div>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={contingencyData.tableRows.length === 0}>
            Save to Summarize drawer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ContingencyColumnConfig({ col, data, dataTypes, config, onConfigChange, invalidType }) {
  const type = inferColumnType(col, data, dataTypes);

  if (invalidType) {
    return (
      <p className="text-xs text-muted-foreground">
        This column type does not support contingency analysis.
      </p>
    );
  }

  if (type === 'string') {
    const distinct = getDistinctValues(data, col);
    const useAll = config.useAll !== false && (!config.selectedValues || config.selectedValues.length === 0);
    const selected = config.selectedValues || [];

    return (
      <div className="space-y-1">
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <Checkbox
            checked={useAll}
            onCheckedChange={(c) => onConfigChange({ ...config, useAll: !!c, selectedValues: c ? [] : selected })}
          />
          Include all values
        </label>
        {!useAll && (
          <div className="max-h-[80px] overflow-y-auto space-y-1">
            {distinct.slice(0, 30).map((v) => (
              <label key={v} className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox
                  checked={selected.includes(v)}
                  onCheckedChange={(c) => {
                    const next = c ? [...selected, v] : selected.filter((x) => x !== v);
                    onConfigChange({ ...config, selectedValues: next });
                  }}
                />
                <span className="truncate">{String(v).slice(0, 40)}{String(v).length > 40 ? '…' : ''}</span>
              </label>
            ))}
            {distinct.length > 30 && <p className="text-[10px] text-muted-foreground">+{distinct.length - 30} more</p>}
          </div>
        )}
      </div>
    );
  }

  if (type === 'number') {
    const { min, max } = getNumericRange(data, col);
    const numBuckets = config.numBuckets ?? 4;

    return (
      <div className="flex items-center gap-2">
        <Label className="text-xs">Buckets</Label>
        <Input
          type="number"
          min={1}
          max={50}
          value={numBuckets}
          onChange={(e) => onConfigChange({ ...config, numBuckets: Math.max(1, parseInt(e.target.value, 10) || 4) })}
          className="w-16 h-7 text-xs"
        />
        <span className="text-[10px] text-muted-foreground">({min.toFixed(0)}–{max.toFixed(0)})</span>
      </div>
    );
  }

  if (type === 'date') {
    const { min, max } = getDateRange(data, col);
    const numBuckets = config.numBuckets ?? 4;

    return (
      <div className="flex items-center gap-2">
        <Label className="text-xs">Buckets</Label>
        <Input
          type="number"
          min={1}
          max={50}
          value={numBuckets}
          onChange={(e) => onConfigChange({ ...config, numBuckets: Math.max(1, parseInt(e.target.value, 10) || 4) })}
          className="w-16 h-7 text-xs"
        />
      </div>
    );
  }

  return null;
}
