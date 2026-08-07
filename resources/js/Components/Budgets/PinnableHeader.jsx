import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, EyeOff, Filter, MoreVertical, Pin, PinOff } from "lucide-react";
import Dropdown from "@/Components/Dropdown.jsx";

// Below this column width, the filter/pin/hide icon row no longer fits next
// to the (now-wrapping, no-longer-truncated) title without visually
// colliding with it — collapse them into a single menu button instead.
const NARROW_WIDTH_THRESHOLD = 110;

export default function PinnableHeader(props) {
    const { displayName, column, api, enableSorting, progressSort, showColumnMenu } = props;
    const hasFilter = !!column.getColDef().filter;
    const [sortDirection, setSortDirection] = useState(column.getSort());
    const [pinned, setPinned] = useState(column.getPinned());
    const [filterActive, setFilterActive] = useState(column.isFilterActive());
    const [width, setWidth] = useState(column.getActualWidth());

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
