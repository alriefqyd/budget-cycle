import { useCallback, useEffect, useMemo, useState } from "react";
import { useGridFilter } from "ag-grid-react";

// Excel-style "pick from a list of existing values" column filter for AG Grid
// Community (the real Set Filter is an Enterprise-only module — this is a
// from-scratch equivalent using AG Grid's custom-filter interface, so it
// works without an Enterprise license).
//
// Usage on a colDef:
//   { field: "project_manager", filter: ExcelStyleFilter,
//     filterParams: { values: uniqueProjectManagerNames } }
const BLANK_LABEL = "(Empty)";

const ExcelStyleFilter = (props) => {
    const { model, onModelChange, values = [], getValue, api } = props;

    const optionValues = useMemo(() => {
        const unique = new Set(values.map((v) => (v === null || v === undefined || v === '' ? BLANK_LABEL : v)));
        // String() guards numeric values (money/year columns) — raw numbers
        // don't have .localeCompare.
        return Array.from(unique).sort((a, b) => String(a).localeCompare(String(b)));
    }, [values]);

    const [selected, setSelected] = useState(() => new Set(model?.values ?? optionValues));
    const [search, setSearch] = useState('');

    // If the underlying set of values changes (e.g. a new PM appears after an
    // edit), reset to "everything selected" rather than silently excluding
    // the new value from an already-narrowed selection.
    useEffect(() => {
        setSelected(new Set(model?.values ?? optionValues));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [optionValues.join('|')]);

    const doesFilterPass = useCallback((params) => {
        const raw = getValue(params.node);
        const value = raw === null || raw === undefined || raw === '' ? BLANK_LABEL : raw;
        return selected.has(value);
    }, [selected, getValue]);

    const isFilterActive = useCallback(() => selected.size !== optionValues.length, [selected, optionValues]);

    useGridFilter({ doesFilterPass, isFilterActive });

    const applySelection = (next) => {
        setSelected(next);
        onModelChange(next.size === optionValues.length ? null : { values: Array.from(next) });
    };

    // Values aren't guaranteed to be strings (e.g. the ID column is numeric) —
    // String() guards .toLowerCase() the same way the sort above already
    // guards .localeCompare().
    const visibleOptions = optionValues.filter((v) => String(v).toLowerCase().includes(search.toLowerCase()));
    const allVisibleSelected = visibleOptions.length > 0 && visibleOptions.every((v) => selected.has(v));

    const toggleAllVisible = () => {
        const next = new Set(selected);
        if (allVisibleSelected) {
            visibleOptions.forEach((v) => next.delete(v));
        } else {
            visibleOptions.forEach((v) => next.add(v));
        }
        applySelection(next);
    };

    const toggleOne = (value) => {
        const next = new Set(selected);
        if (next.has(value)) next.delete(value); else next.add(value);
        applySelection(next);
    };

    // Excel's own filter search narrows the checkbox list live as you type,
    // but doesn't apply anything until you act on it — Enter is the fast
    // path: narrow to whatever's currently matching and filter to just that,
    // without needing to click each checkbox (or "Select All") by hand.
    const applySearchAsFilter = () => {
        if (!search || visibleOptions.length === 0) return;
        applySelection(new Set(visibleOptions));
        // Matches hitting "OK" in Excel's own filter dropdown — Enter both
        // applies and closes it, instead of leaving the user to dismiss the
        // popup themselves after they've already told it what they want.
        api?.hidePopupMenu();
    };

    return (
        <div className="w-64 p-2 font-body-sm text-body-sm" onKeyDown={(e) => e.stopPropagation()}>
            <input
                type="text"
                autoFocus
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        applySearchAsFilter();
                    }
                }}
                className="w-full px-2 py-1.5 mb-2 border border-outline-variant rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
            />
            <label className="flex items-center gap-2 px-1 py-1 font-bold cursor-pointer border-b border-outline-variant pb-2 mb-1">
                <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} />
                (Select All)
            </label>
            <div className="max-h-56 overflow-y-auto">
                {visibleOptions.length === 0 && (
                    <p className="text-on-surface-variant px-1 py-2">No results.</p>
                )}
                {visibleOptions.map((value) => (
                    <label key={value} className="flex items-center gap-2 px-1 py-1 hover:bg-surface-container rounded cursor-pointer">
                        <input type="checkbox" checked={selected.has(value)} onChange={() => toggleOne(value)} />
                        <span className="truncate">{value}</span>
                    </label>
                ))}
            </div>
            <div className="flex justify-between pt-2 mt-1 border-t border-outline-variant">
                <button
                    type="button"
                    onClick={() => applySelection(new Set())}
                    className="text-xs text-error hover:underline"
                >
                    Clear All
                </button>
                <button
                    type="button"
                    onClick={() => applySelection(new Set(optionValues))}
                    className="text-xs text-primary hover:underline"
                >
                    Select All
                </button>
            </div>
        </div>
    );
};

export default ExcelStyleFilter;
