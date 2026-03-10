'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useMyStateV2 } from '@/context/stateContextV2';
import { BarChart3, Table2 } from 'lucide-react';
import { FrequencyCountDialog } from './FrequencyCountDialog';
import { ContingencyTableDialog } from './ContingencyTableDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export function SummarizeDrawer({ open, onOpenChange }) {
  const contextStateV2 = useMyStateV2();
  const summarizationTables = contextStateV2?.summarizationTables || [];
  const setSummarizationTables = contextStateV2?.setSummarizationTables || (() => {});
  const setViewing = contextStateV2?.setViewing;
  const setChartDataOverride = contextStateV2?.setChartDataOverride;
  const setChartDataOverrideMeta = contextStateV2?.setChartDataOverrideMeta;

  const [freqDialogOpen, setFreqDialogOpen] = useState(false);
  const [contingencyDialogOpen, setContingencyDialogOpen] = useState(false);
  const [activeTableId, setActiveTableId] = useState(null);

  const handleChartSummary = (table) => {
    setChartDataOverride(table.data);
    setChartDataOverrideMeta({
      type: table.type,
      title: table.title,
      summarizationId: table.id,
    });
    setViewing?.('charts');
    onOpenChange?.(false);
  };

  const handleRemoveTable = (id) => {
    setSummarizationTables((prev) => prev.filter((t) => t.id !== id));
    if (activeTableId === id) setActiveTableId(null);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-[95vw] sm:max-w-[900px] overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle className="text-xl">Summarize</SheetTitle>
            <SheetDescription>
              Quickly aggregate, pivot, and compute statistics on your data to explore patterns and relationships.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="default"
                className="gap-2"
                onClick={() => setFreqDialogOpen(true)}
              >
                <BarChart3 className="h-4 w-4" />
                Frequency Count
              </Button>
              <Button
                variant="outline"
                size="default"
                className="gap-2"
                onClick={() => setContingencyDialogOpen(true)}
              >
                <Table2 className="h-4 w-4" />
                Contingency Table
              </Button>
            </div>

            {summarizationTables.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Saved Summaries</h3>
                <div className="space-y-2">
                  {summarizationTables.map((table) => (
                    <div
                      key={table.id}
                      className="rounded-lg border p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">
                          {table.type === 'frequencyCount' ? 'Frequency Count' : 'Contingency Table'}
                        </Badge>
                        <span className="text-sm font-medium truncate flex-1 mx-2">
                          {table.title}
                        </span>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => setActiveTableId(activeTableId === table.id ? null : table.id)}
                          >
                            {activeTableId === table.id ? 'Hide' : 'Preview'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1"
                            onClick={() => handleChartSummary(table)}
                          >
                            Chart summary table
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-destructive hover:text-destructive"
                            onClick={() => handleRemoveTable(table.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                      {activeTableId === table.id && (
                        <div className="overflow-x-auto max-h-[300px] overflow-y-auto rounded border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                {table.data?.[0] &&
                                  Object.keys(table.data[0]).map((k) => (
                                    <TableHead key={k} className="text-xs">
                                      {k}
                                    </TableHead>
                                  ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(table.data || []).slice(0, 20).map((row, i) => (
                                <TableRow key={i}>
                                  {Object.values(row).map((v, j) => (
                                    <TableCell key={j} className="text-xs">
                                      {v != null ? String(v) : ''}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          {(table.data?.length || 0) > 20 && (
                            <div className="text-xs text-muted-foreground p-2 text-center">
                              … and {table.data.length - 20} more rows
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <FrequencyCountDialog
        open={freqDialogOpen}
        onOpenChange={setFreqDialogOpen}
        onSave={(table) => {
          setSummarizationTables((prev) => [...prev, table]);
          setFreqDialogOpen(false);
        }}
      />

      <ContingencyTableDialog
        open={contingencyDialogOpen}
        onOpenChange={setContingencyDialogOpen}
        onSave={(table) => {
          setSummarizationTables((prev) => [...prev, table]);
          setContingencyDialogOpen(false);
        }}
      />
    </>
  );
}
