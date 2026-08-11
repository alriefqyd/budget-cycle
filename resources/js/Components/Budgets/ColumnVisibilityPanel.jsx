import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, EyeOff, Columns3 } from "lucide-react";
import Dropdown from "@/Components/Dropdown.jsx";

// Per-year/per-month cost & cash columns already show/hide themselves based
// on the active tab (Budget 5 Years vs Year To Date) — letting this panel
// also control them would fight with that tab logic and confuse the "N
// hidden" count with columns that are only hidden because of the tab, not a
// deliberate user choice. Only the tab-independent columns are listed here.
export const TAB_CONTROLLED_FIELD = /^(total_)?(cost|cash|commitment)_\d+(_\d+)?(_remaining)?$/;

// Flattens columnDefs (which nests year/actual/forecast columns under
// group headers via `children`) into a single list of {field, label} for
// the checkbox panel — the grid's own column tree isn't queried directly so
// this stays in sync with whatever Show.jsx currently authored.
function flattenColumns(columnDefs) {
    const out = [];
    for (const def of columnDefs) {
        if (!def.headerName) continue; // rowActions etc. — nothing meaningful to toggle
        if (def.field === 'top' || TAB_CONTROLLED_FIELD.test(def.field || '')) continue;
        if (Array.isArray(def.children)) {
            def.children.forEach(child => {
                if (!child.headerName || !child.field) return;
                out.push({ field: child.field, label: `${def.headerName} — ${child.headerName}` });
            });
        } else if (def.field) {
            out.push({ field: def.field, label: def.headerName });
        }
    }
    return out;
}

// Lets a user bring back a column they (or the header's "hide" icon)
// switched off — once a column is hidden its header disappears with it, so
// there has to be somewhere else to find it again.
export default function ColumnVisibilityPanel({ api, columnDefs }) {
    const [search, setSearch] = useState('');
    const [hiddenFields, setHiddenFields] = useState(() => new Set());

    const allColumns = useMemo(() => flattenColumns(columnDefs), [columnDefs]);

    useEffect(() => {
        if (!api) return;
        const syncFromGrid = () => {
            const hidden = new Set();
            api.getColumns()?.forEach(col => {
                if (!col.isVisible()) hidden.add(col.getColId());
            });
            setHiddenFields(hidden);
        };
        syncFromGrid();
        api.addEventListener('columnVisible', syncFromGrid);
        return () => api.removeEventListener('columnVisible', syncFromGrid);
    }, [api]);

    const toggleColumn = (field, e) => {
        e.stopPropagation();
        api.setColumnsVisible([field], hiddenFields.has(field));
    };

    const visible = allColumns.filter(c => c.label.toLowerCase().includes(search.toLowerCase()));
    const hiddenCount = allColumns.filter(c => hiddenFields.has(c.field)).length;

    // Master checkbox: checked when every column is visible, unchecked when
    // every column is hidden, indeterminate for anything in between — same
    // three-state convention as a table's "select all" header checkbox.
    const allSelected = hiddenCount === 0;
    const noneSelected = hiddenCount === allColumns.length && allColumns.length > 0;
    const selectAllRef = useRef(null);
    useEffect(() => {
        if (selectAllRef.current) selectAllRef.current.indeterminate = !allSelected && !noneSelected;
    }, [allSelected, noneSelected]);

    const toggleSelectAll = (e) => {
        e.stopPropagation();
        api.setColumnsVisible(allColumns.map(c => c.field), !allSelected);
    };

    return (
        <Dropdown>
            <Dropdown.Trigger>
                <button className="inline-flex items-center gap-2 px-stack-md py-2 border border-outline-variant bg-surface text-on-surface-variant rounded-lg font-label-caps text-label-caps hover:bg-surface-container transition-all active:scale-95 shadow-sm">
                    <Columns3 size={18} />
                    Columns{hiddenCount > 0 ? ` (${hiddenCount} hidden)` : ''}
                </button>
            </Dropdown.Trigger>
            <Dropdown.Content align="right" width="64" contentClasses="py-1.5 bg-white w-72">
                <div className="p-2" onClick={(e) => e.stopPropagation()}>
                    <input
                        type="text"
                        autoFocus
                        placeholder="Search columns..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full px-2 py-1.5 mb-2 border border-outline-variant rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
                    />
                    <label className="flex items-center gap-2 px-1 py-1.5 mb-1 border-b border-outline-variant font-bold cursor-pointer text-sm">
                        <input
                            ref={selectAllRef}
                            type="checkbox"
                            checked={allSelected}
                            onChange={toggleSelectAll}
                        />
                        Select All
                    </label>
                    <div className="max-h-72 overflow-y-auto">
                        {visible.map(col => {
                            const isHidden = hiddenFields.has(col.field);
                            return (
                                <label key={col.field} className="flex items-center gap-2 px-1 py-1.5 hover:bg-surface-container rounded cursor-pointer text-sm">
                                    <input
                                        type="checkbox"
                                        checked={!isHidden}
                                        onChange={(e) => toggleColumn(col.field, e)}
                                    />
                                    {isHidden ? <EyeOff size={14} className="text-on-surface-variant shrink-0" /> : <Eye size={14} className="text-primary shrink-0" />}
                                    <span className="truncate">{col.label}</span>
                                </label>
                            );
                        })}
                        {visible.length === 0 && (
                            <p className="text-on-surface-variant text-sm px-1 py-2">No results.</p>
                        )}
                    </div>
                </div>
            </Dropdown.Content>
        </Dropdown>
    );
}
