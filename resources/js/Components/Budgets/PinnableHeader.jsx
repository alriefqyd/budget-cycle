import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, EyeOff, Filter, Pin, PinOff } from "lucide-react";

export default function PinnableHeader(props) {
    const { displayName, column, api, enableSorting, progressSort, showColumnMenu } = props;
    const hasFilter = !!column.getColDef().filter;
    const [sortDirection, setSortDirection] = useState(column.getSort());
    const [pinned, setPinned] = useState(column.getPinned());
    const [filterActive, setFilterActive] = useState(column.isFilterActive());

    useEffect(() => {
        const onSortChanged = () => setSortDirection(column.getSort());
        const onPinnedChanged = () => setPinned(column.getPinned());
        const onFilterChanged = () => setFilterActive(column.isFilterActive());
        column.addEventListener('sortChanged', onSortChanged);
        column.addEventListener('pinnedChanged', onPinnedChanged);
        column.addEventListener('filterChanged', onFilterChanged);
        return () => {
            column.removeEventListener('sortChanged', onSortChanged);
            column.removeEventListener('pinnedChanged', onPinnedChanged);
            column.removeEventListener('filterChanged', onFilterChanged);
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

    return (
        <div className="flex items-center justify-between w-full h-full gap-1">
            <span
                className={`truncate flex items-center gap-1 min-w-0 ${enableSorting ? 'cursor-pointer' : ''}`}
                onClick={onLabelClick}
                title={displayName}
            >
                <span className="truncate">{displayName}</span>
                {sortDirection === 'asc' && <ArrowUp size={12} className="shrink-0" />}
                {sortDirection === 'desc' && <ArrowDown size={12} className="shrink-0" />}
            </span>
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
        </div>
    );
}
