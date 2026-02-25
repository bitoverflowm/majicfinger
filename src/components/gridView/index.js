import { useEffect, useMemo, useState, useCallback } from 'react';

import { useMyStateV2  } from '@/context/stateContextV2'

import { AgGridReact } from 'ag-grid-react'; // React Grid Logic
import "ag-grid-community/styles/ag-grid.css"; // Core CSS
import "ag-grid-community/styles/ag-theme-quartz.css"; // Theme


import { PlusIcon } from "@radix-ui/react-icons"
import { toast } from "sonner"

import { Menu } from './menu'

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { ArrowDownFromLine, ArrowUpFromLine, TrafficCone, Filter, RotateCcw, ArrowUpDown, ArrowUp, ArrowDown, Calendar, X, Download } from 'lucide-react';
import * as XLSX from 'xlsx';


const DATE_LIKE = /^\d{4}-\d{2}-\d{2}/;

function getColKeys(connectedCols) {
  return (connectedCols || []).map((c) => (c && typeof c === 'object' && 'field' in c ? c.field : c)).filter(Boolean);
}

const GridView = ({startNew}) => {

    const contextStateV2 = useMyStateV2()

    let connectedCols = contextStateV2?.connectedCols || []
    let setConnectedCols = contextStateV2?.setConnectedCols || []
    let connectedData = contextStateV2?.connectedData || []
    let setConnectedData = contextStateV2?.setConnectedData || []
    
    const [columnName, setColumnName] = useState('');
    const [colAddOpen, setColAddOpen] = useState()
    const [gridExpanded, setGridExpanded] = useState()

    const [filterState, setFilterState] = useState({
      dateColumn: null,
      dateFrom: '',
      dateTo: '',
      sortKey: null,
      sortDir: 'asc',
      categoryFilters: {},
    });

    const colKeys = useMemo(() => getColKeys(connectedCols), [connectedCols]);
    const dateColumns = useMemo(() => {
      if (!connectedData.length) return [];
      const first = connectedData[0];
      return colKeys.filter((key) => {
        const v = first[key];
        return v != null && typeof v === 'string' && DATE_LIKE.test(v);
      });
    }, [connectedData, colKeys]);

    const displayData = useMemo(() => {
      const withIndex = (connectedData || []).map((r, i) => ({ ...r, _origIndex: i }));
      let out = withIndex;
      const { dateColumn, dateFrom, dateTo, sortKey, sortDir, categoryFilters } = filterState;
      if (dateColumn && (dateFrom || dateTo)) {
        out = out.filter((row) => {
          const raw = row[dateColumn];
          if (raw == null || raw === '') return false;
          const t = typeof raw === 'string' && DATE_LIKE.test(raw) ? new Date(raw).getTime() : Number(raw);
          if (Number.isNaN(t)) return true;
          if (dateFrom) {
            const from = new Date(dateFrom).getTime();
            if (t < from) return false;
          }
          if (dateTo) {
            const to = new Date(dateTo).getTime();
            if (t > to) return false;
          }
          return true;
        });
      }
      const catKeys = Object.keys(categoryFilters || {}).filter((k) => (categoryFilters[k] || []).length > 0);
      if (catKeys.length > 0) {
        out = out.filter((row) =>
          catKeys.every((col) => {
            const allowed = categoryFilters[col];
            const val = row[col];
            const s = val != null ? String(val) : '';
            return allowed.includes(s);
          })
        );
      }
      if (sortKey) {
        out = [...out].sort((a, b) => {
          const va = a[sortKey];
          const vb = b[sortKey];
          const cmp = va == null && vb == null ? 0 : va == null ? 1 : vb == null ? -1 : String(va).localeCompare(String(vb), undefined, { numeric: true });
          return sortDir === 'asc' ? cmp : -cmp;
        });
      }
      return out;
    }, [connectedData, filterState]);

    const columnDefsWithMeta = useMemo(() => {
      const cols = (connectedCols || []).map((c) => {
        const field = c && typeof c === 'object' && 'field' in c ? c.field : c;
        const isIdLike = field && (field === 'id' || field.toLowerCase().endsWith('id'));
        return typeof c === 'object' && c !== null
          ? { ...c, valueFormatter: isIdLike ? (p) => (p?.value != null ? String(p.value) : '') : c.valueFormatter }
          : { field: c, valueFormatter: isIdLike ? (p) => (p?.value != null ? String(p.value) : '') : undefined };
      });
      cols.push({ field: '_origIndex', hide: true, suppressColumnsToolPanel: true });
      return cols;
    }, [connectedCols]);

    const distinctByColumn = useMemo(() => {
      const map = {};
      colKeys.forEach((key) => {
        const set = new Set();
        (connectedData || []).forEach((row) => {
          const v = row[key];
          if (v != null && v !== '') set.add(String(v));
        });
        map[key] = Array.from(set).sort();
      });
      return map;
    }, [connectedData, colKeys]);

    const resetFilters = useCallback(() => {
      setFilterState({
        dateColumn: null,
        dateFrom: '',
        dateTo: '',
        sortKey: null,
        sortDir: 'asc',
        categoryFilters: {},
      });
      toast('Filters reset to original data');
    }, []);

    const setCategoryFilter = useCallback((col, values) => {
      setFilterState((prev) => ({
        ...prev,
        categoryFilters: { ...(prev.categoryFilters || {}), [col]: values },
      }));
    }, []);

    // Export: data to download (displayData without internal _origIndex)
    const exportData = useMemo(() => {
      if (!displayData || !displayData.length) return [];
      return displayData.map(({ _origIndex, ...row }) => row);
    }, [displayData]);

    const downloadFile = useCallback((blob, filename) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }, []);

    const downloadCSV = useCallback(() => {
      if (!exportData.length) {
        toast.error('No data to export');
        return;
      }
      const cols = colKeys.length ? colKeys : Object.keys(exportData[0] || {});
      const escape = (v) => {
        const s = v == null ? '' : String(v);
        if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
        return s;
      };
      const header = cols.map(escape).join(',');
      const rows = exportData.map((row) => cols.map((c) => escape(row[c])).join(','));
      const csv = [header, ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      downloadFile(blob, `export-${Date.now()}.csv`);
      toast.success('CSV downloaded');
    }, [exportData, colKeys, downloadFile]);

    const downloadJSON = useCallback(() => {
      if (!exportData.length) {
        toast.error('No data to export');
        return;
      }
      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
      downloadFile(blob, `export-${Date.now()}.json`);
      toast.success('JSON downloaded');
    }, [exportData, downloadFile]);

    const downloadXLSX = useCallback(() => {
      if (!exportData.length) {
        toast.error('No data to export');
        return;
      }
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      XLSX.writeFile(wb, `export-${Date.now()}.xlsx`);
      toast.success('Excel file downloaded');
    }, [exportData]);

    //Apply settings across all columns
    const defaultColDef = useMemo(() => ({
        filter: true, // Enable filtering on all columns
        //maxWidth: 120,
        editable: true,
        background: {visible: false},
        resizable: true,
        singleClickEdit: true,
        stopEditingWhenCellsLoseFocus : true,
    }))

    const autoSizeStrategy = {
        type: 'fitGridWidth',
        defaultMinWidth: 100,
    };

    const gridOptions = useMemo(()=> ({
        onCellClicked: (e) => toast(`Hit Enter to accept change`, {
            duration: 5000
        }),
    }))

    const updateCellData = (rowIndex, field, newValue) => {
        if (field === '_origIndex') return;
        if (newValue === "PRETTY PLEASE DELETE ROW") {
            handleDeleteRow(rowIndex);
            return;
        }
        const row = displayData[rowIndex];
        const origIndex = row && row._origIndex;
        if (origIndex == null) return;
        setConnectedData((prevData) => {
          const newData = prevData.map((item, index) =>
            index === origIndex ? { ...item, [field]: newValue } : item
          );
          return newData;
        });
        toast('Data updated. Chart updated!', { duration: 5000 });
    };

    const handleAddRow = () => {
        const newRow = {};
        colKeys.forEach((key) => { newRow[key] = ''; });
        setConnectedData([...(connectedData || []), newRow])

        toast(`New Row added!`, {
            duration: 5000
        })   
    }

    const handleAddColumn = (name) => {
        let newCols = [...connectedCols, { field: name }];
        setConnectedCols(newCols);
        //adding col to data as well
        if(connectedData.length > 0){
            setConnectedData(prevData => {
                // Create a new array with updated data
                const newData = prevData.map((item, index) => {
                    return { ...item, [name]: '' }; // Update the specific field value
                });
                return newData;
              });
        }else{
            setConnectedData(prevData => {
                return prevData.map(item => {
                  return { ...item, [name]: '' };
                }).concat([{ [name]: '' }]);
              });
        }
        setColAddOpen(false)

        toast(`New Column added!`, {
            duration: 5000
        })   
    }

    const handleInputChange = (event) => {
        setColumnName(event.target.value);
      };
    
    const handleSubmit = () => {
        handleAddColumn(columnName);
        setColumnName(''); // Clear the input field
    };

    const handleDeleteRow = (displayRowIndex) => {
        const row = displayData[displayRowIndex];
        const origIndex = row && row._origIndex;
        if (origIndex == null) return;
        setConnectedData((prevData) => prevData.filter((_, index) => index !== origIndex));
        toast('Row deleted!', { duration: 5000 });
    };
    

    useEffect(()=>{
        startNew && setConnectedData([])
    }, [startNew])

    return (
        <div className="ag-theme-quartz" style={{ height: '100%', width: '100%' }}>
            <Alert className="mt-4 sm:hidden">
                <div className="flex gap-2 place-items-center"><TrafficCone className="w-8 h-8"/>
                    <div className="">
                        <p className="text-xs">Looks like you're on-the-go!</p>
                        <p className="text-xs text-muted-foreground">I tried to keep it mobile-friendly, but Lychee really flexes its muscles on bigger screens.</p>
                    </div>
                </div>
            </Alert>  
            {connectedData && connectedData.length > 0 && (
            <Tabs defaultValue="table" className="w-full min-w-0">
              <div className="flex flex-wrap items-center gap-2 py-2 border-b">
                <TabsList className="h-9">
                  <TabsTrigger value="table" className="text-xs">Table</TabsTrigger>
                  <TabsTrigger value="sort-filter" className="text-xs gap-1">
                    <Filter className="h-3.5 w-3.5" />
                    Sort & filter
                  </TabsTrigger>
                </TabsList>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={resetFilters}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                      <Download className="h-3.5 w-3.5" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={downloadCSV}>Download CSV</DropdownMenuItem>
                    <DropdownMenuItem onClick={downloadJSON}>Download JSON</DropdownMenuItem>
                    <DropdownMenuItem onClick={downloadXLSX}>Download XLSX</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <TabsContent value="sort-filter" className="mt-3">
                <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg border bg-muted/30">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                        <Filter className="h-3.5 w-3.5" />
                        Sort / Select / Filter
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-52" align="start">
                      <DropdownMenuLabel className="text-xs">Filter & date</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {dateColumns.length > 0 && (
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="text-xs">
                            <Calendar className="h-3.5 w-3.5 mr-2" />
                            Date range
                          </DropdownMenuSubTrigger>
                          <DropdownMenuPortal>
                            <DropdownMenuSubContent className="w-56 p-2">
                              <DropdownMenuLabel className="text-xs">Column</DropdownMenuLabel>
                              <Select value={filterState.dateColumn || ''} onValueChange={(v) => setFilterState((p) => ({ ...p, dateColumn: v || null }))}>
                                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Pick column" /></SelectTrigger>
                                <SelectContent>
                                  {dateColumns.map((col) => (
                                    <SelectItem key={col} value={col} className="text-xs">{col}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Label className="text-[10px] text-muted-foreground mt-2 block">From</Label>
                              <Input type="date" className="h-8 text-xs mt-0.5" value={filterState.dateFrom} onChange={(e) => setFilterState((p) => ({ ...p, dateFrom: e.target.value }))} />
                              <Label className="text-[10px] text-muted-foreground mt-1 block">To</Label>
                              <Input type="date" className="h-8 text-xs mt-0.5" value={filterState.dateTo} onChange={(e) => setFilterState((p) => ({ ...p, dateTo: e.target.value }))} />
                            </DropdownMenuSubContent>
                          </DropdownMenuPortal>
                        </DropdownMenuSub>
                      )}
                      {colKeys.map((col) => {
                        const options = distinctByColumn[col] || [];
                        if (options.length === 0 || options.length > 100) return null;
                        return (
                          <DropdownMenuSub key={col}>
                            <DropdownMenuSubTrigger className="text-xs">
                              <span className="truncate">Filter: {col}</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                              <DropdownMenuSubContent className="max-h-[220px] w-56 overflow-y-auto">
                                <DropdownMenuGroup>
                                  <DropdownMenuLabel className="text-xs">Values</DropdownMenuLabel>
                                  {(options.slice(0, 60)).map((val) => {
                                    const selected = filterState.categoryFilters?.[col] || [];
                                    const isChecked = selected.includes(val);
                                    return (
                                      <DropdownMenuCheckboxItem
                                        key={val}
                                        checked={isChecked}
                                        onCheckedChange={(checked) => {
                                          const next = checked ? [...selected, val] : selected.filter((x) => x !== val);
                                          setCategoryFilter(col, next);
                                        }}
                                      >
                                        <span className="truncate">{String(val).slice(0, 40)}{String(val).length > 40 ? '…' : ''}</span>
                                      </DropdownMenuCheckboxItem>
                                    );
                                  })}
                                  {options.length > 60 && <div className="px-2 py-1 text-[10px] text-muted-foreground">+{options.length - 60} more</div>}
                                </DropdownMenuGroup>
                              </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                          </DropdownMenuSub>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Sort by</Label>
                    <Select value={filterState.sortKey || ''} onValueChange={(v) => setFilterState((p) => ({ ...p, sortKey: v || null }))}>
                      <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue placeholder="Column" /></SelectTrigger>
                      <SelectContent>
                        {colKeys.map((col) => (
                          <SelectItem key={col} value={col} className="text-xs">{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {filterState.sortKey && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 shrink-0"
                        onClick={() => setFilterState((p) => ({ ...p, sortDir: p.sortDir === 'asc' ? 'desc' : 'asc' }))}
                        title={filterState.sortDir === 'asc' ? 'Descending' : 'Ascending'}
                      >
                        {filterState.sortDir === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
                      </Button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 ml-auto min-w-0">
                    {filterState.dateColumn && (filterState.dateFrom || filterState.dateTo) && (
                      <Badge variant="secondary" className="text-[10px] gap-1 pr-1 pl-2 py-0.5">
                        <Calendar className="h-3 w-3" />
                        {filterState.dateColumn}: {filterState.dateFrom || '…'} → {filterState.dateTo || '…'}
                        <button type="button" className="rounded-full hover:bg-muted p-0.5" onClick={() => setFilterState((p) => ({ ...p, dateColumn: null, dateFrom: '', dateTo: '' }))} aria-label="Remove date filter">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                    {filterState.sortKey && (
                      <Badge variant="secondary" className="text-[10px] gap-1 pr-1 pl-2 py-0.5">
                        <ArrowUpDown className="h-3 w-3" />
                        {filterState.sortKey} {filterState.sortDir === 'asc' ? '↑' : '↓'}
                        <button type="button" className="rounded-full hover:bg-muted p-0.5" onClick={() => setFilterState((p) => ({ ...p, sortKey: null, sortDir: 'asc' }))} aria-label="Remove sort">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                    {Object.entries(filterState.categoryFilters || {}).map(([col, values]) => {
                      if (!values?.length) return null;
                      return (
                        <Badge key={col} variant="secondary" className="text-[10px] gap-1 pr-1 pl-2 py-0.5">
                          {col}: {values.length} selected
                          <button type="button" className="rounded-full hover:bg-muted p-0.5" onClick={() => setCategoryFilter(col, [])} aria-label={`Remove filter ${col}`}>
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="table" className="mt-0" />
            </Tabs>
            )}
            <div className='pt-2 pb-2 flex place-items-center gap-2' >
                <div className=''>
                    <Menu />
                </div>
                <div className='ml-auto flex place-items-center gap-2'>
                    <Dialog open={colAddOpen} onOpenChange={setColAddOpen}>
                        <Label className="text-black text-xs">Add Column</Label>
                        <DialogTrigger asChild>    
                            <Button variant="outline" size="icon">
                                <PlusIcon className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Add Column</DialogTitle>
                                <DialogDescription>
                                    Name your column
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="name" className="text-right">
                                        Name
                                    </Label>
                                    <Input
                                        id="name"
                                        defaultValue="Placeholder"
                                        value={columnName}
                                        onChange={handleInputChange}
                                        className="col-span-3"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                            handleSubmit(columnName);
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" onClick={()=>handleSubmit(columnName)}>Save changes</Button>
                            </DialogFooter>                        
                        </DialogContent>
                    </Dialog>               
                    <Label className="text-black text-xs">Add Row</Label>
                    <Button variant="outline" size="icon" onClick={()=>handleAddRow()}>
                        <PlusIcon className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    </Button>
                </div>
            </div>
            <div className={gridExpanded ? 'h-[750px]' :'h-[550px]'}>
                <AgGridReact 
                    defaultColDef={defaultColDef} 
                    rowData={displayData} 
                    columnDefs={columnDefsWithMeta} 
                    pagination={true}
                    onCellValueChanged={(event) => {
                        const rowIndex = event.rowIndex;
                        const field = event.colDef?.field;
                        const newValue = event.newValue;
                        if (field) updateCellData(rowIndex, field, newValue);
                    }}
                    gridOptions={gridOptions}
                    autoSizeStrategy={autoSizeStrategy}
                    />
            </div>
            <div className='flex py-2 text-xs'><div className='w-full'>Calculate:</div> <div className='text-slate-400' onClick={()=>setGridExpanded(!gridExpanded)}> {gridExpanded ? <ArrowUpFromLine className='w-6 h-4 cursor-pointer'/> : <ArrowDownFromLine className='w-6 h-4 cursor-pointer'/>}</div></div>
            <div>
                <Alert>
                    Aggregations, calculations, code operations coming soon
                </Alert>
            </div>
        </div>
    )



}

export default GridView;