import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDown, ArrowUp, EyeOff, Filter, Info, MoreVertical, Pin, PinOff } from "lucide-react";
import Dropdown from "@/Components/Dropdown.jsx";

// Below this column width, the filter/pin/hide icon row no longer fits next
// to the (now-wrapping, no-longer-truncated) title without visually
// colliding with it — collapse them into a single menu button instead.
const NARROW_WIDTH_THRESHOLD = 110;

export default function PinnableHeader(props) {
    const { displayName, column, api, enableSorting, progressSort, showColumnMenu, formula } = props;
    const hasFilter = !!column.getColDef().filter;
    const [sortDirection, setSortDirection] = useState(column.getSort());
    const [pinned, setPinned] = useState(column.getPinned());
    const [filterActive, setFilterActive] = useState(column.isFilterActive());
    const [width, setWidth] = useState(column.getActualWidth());
    const [formulaOpen, setFormulaOpen] = useState(false);
    const [formulaPos, setFormulaPos] = useState(null);
    const infoBtnRef = useRef(null);

    useEffect(() => {
        const onSortChanged = () => setSortDirection(column.getSort());
        const onPinnedChanged = () => setPinned(column.getPinned());
        const onFilterChanged = () => setFilterActive(column.isFilterActive());
        const onWidthChanged = () => setWidth(column.getActualWidth());
        column.addEventListener('sortChanged', onSortChanged);
        column.addEventListener('pinnedChanged', onPinnedChanged);
        column.addEventListener('filterChanged', onFilterChanged);
        column.addEventListener('widthChanged', onWidthChanged);
        return () => {
            column.removeEventListener('sortChanged', onSortChanged);
            column.removeEventListener('pinnedChanged', onPinnedChanged);
            column.removeEventListener('filterChanged', onFilterChanged);
            column.removeEventListener('widthChanged', onWidthChanged);
        };
    }, [column]);

    // The formula popup itself is rendered via a portal straight onto
    // <body> (see below) so ag-grid's `overflow: hidden` header cells don't
    // clip it — but that means it no longer scrolls/resizes with the grid,
    // so it just closes on either instead of drifting away from the icon
    // that opened it.
    useEffect(() => {
        if (!formulaOpen) return;
        const close = () => setFormulaOpen(false);
        window.addEventListener('scroll', close, true);
        window.addEventListener('resize', close);
        return () => {
            window.removeEventListener('scroll', close, true);
            window.removeEventListener('resize', close);
        };
    }, [formulaOpen]);

    const toggleFormula = (e) => {
        e.stopPropagation();
        if (!formulaOpen && infoBtnRef.current) {
            const rect = infoBtnRef.current.getBoundingClientRect();
            setFormulaPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
        }
        setFormulaOpen(o => !o);
    };

    const onLabelClick = (e) => {
        if (!enableSorting) return;
        progressSort(e.shiftKey);
    };

    const togglePin = (e) => {
        e.stopPropagation();
        api.setColumnsPinned([column.getColId()], pinned ? null : 'left');
    };

    const openFilter = (e) => {
        e.stopPropagation();
        showColumnMenu(e.currentTarget);
    };

    const hideColumn = (e) => {
        e.stopPropagation();
        api.setColumnsVisible([column.getColId()], false);
    };

    const isNarrow = width > 0 && width < NARROW_WIDTH_THRESHOLD;
    const hasActions = hasFilter || !!displayName;

    return (
        <div className="flex items-center justify-between w-full h-full gap-1">
            <span
                className={`flex items-center gap-1 min-w-0 ${enableSorting ? 'cursor-pointer' : ''}`}
                onClick={onLabelClick}
                title={displayName}
            >
                <span className="whitespace-normal break-words leading-tight">{displayName}</span>
                {sortDirection === 'asc' && <ArrowUp size={12} className="shrink-0" />}
                {sortDirection === 'desc' && <ArrowDown size={12} className="shrink-0" />}
            </span>

            {formula && (
                <>
                    <button
                        ref={infoBtnRef}
                        type="button"
                        onClick={toggleFormula}
                        title="How this value is calculated"
                        className="p-0.5 rounded hover:bg-black/10 opacity-50 hover:opacity-100 text-primary transition-opacity shrink-0"
                    >
                        <Info size={13} />
                    </button>
                    {formulaOpen && formulaPos && createPortal(
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setFormulaOpen(false)} />
                            <div
                                className="fixed z-50 p-3 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 bg-white text-on-surface-variant normal-case font-normal text-xs leading-snug max-w-[240px] whitespace-normal"
                                style={{ top: formulaPos.top, right: formulaPos.right }}
                            >
                                {formula}
                            </div>
                        </>,
                        document.body
                    )}
                </>
            )}

            {isNarrow ? (
                hasActions && (
                    <Dropdown>
                        <Dropdown.Trigger>
                            <button
                                type="button"
                                onClick={(e) => e.stopPropagation()}
                                title="Column actions"
                                className={`p-0.5 rounded hover:bg-black/10 transition-opacity shrink-0 ${filterActive || pinned ? 'opacity-100 text-primary' : 'opacity-50 hover:opacity-100'}`}
                            >
                                <MoreVertical size={14} />
                            </button>
                        </Dropdown.Trigger>
                        <Dropdown.Content align="right" width="48" contentClasses="py-1 bg-white w-44">
                            {hasFilter && (
                                <button
                                    type="button"
                                    onClick={openFilter}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-on-surface-variant hover:bg-surface-container text-left"
                                >
                                    <Filter size={14} className={filterActive ? 'text-primary' : ''} />
                                    {filterActive ? 'Edit filter' : 'Filter'}
                                </button>
                            )}
                            {displayName && (
                                <button
                                    type="button"
                                    onClick={togglePin}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-on-surface-variant hover:bg-surface-container text-left"
                                >
                                    {pinned ? <PinOff size={14} /> : <Pin size={14} />}
                                    {pinned ? 'Unpin column' : 'Pin column'}
                                </button>
                            )}
                            {displayName && (
                                <button
                                    type="button"
                                    onClick={hideColumn}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-on-surface-variant hover:bg-surface-container text-left"
                                >
                                    <EyeOff size={14} />
                                    Hide column
                                </button>
                            )}
                        </Dropdown.Content>
                    </Dropdown>
                )
            ) : (
                <span className="flex items-center gap-0.5 shrink-0">
                    {hasFilter && (
                        <button
                            type="button"
                            onClick={openFilter}
                            title={filterActive ? 'Filter active — click to edit' : 'Filter this column'}
                            className={`p-0.5 rounded hover:bg-black/10 transition-opacity ${filterActive ? 'opacity-100 text-primary' : 'opacity-40 hover:opacity-100'}`}
                        >
                            <Filter size={13} />
                        </button>
                    )}
                    {displayName && (
                        <button
                            type="button"
                            onClick={togglePin}
                            title={pinned ? 'Unpin column' : 'Pin column'}
                            className={`p-0.5 rounded hover:bg-black/10 transition-opacity ${pinned ? 'opacity-100 text-primary' : 'opacity-40 hover:opacity-100'}`}
                        >
                            {pinned ? <PinOff size={13} /> : <Pin size={13} />}
                        </button>
                    )}
                    {displayName && (
                        <button
                            type="button"
                            onClick={hideColumn}
                            title="Hide this column"
                            className="p-0.5 rounded hover:bg-black/10 opacity-40 hover:opacity-100 transition-opacity"
                        >
                            <EyeOff size={13} />
                        </button>
                    )}
                </span>
            )}
        </div>
    );
}
