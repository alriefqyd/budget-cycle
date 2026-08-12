import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Excel-style "suggest a previously-used value in this column as you type"
// cell editor for AG Grid Community (no built-in equivalent — Enterprise's
// Rich Select is a fixed-list picker, not a type-ahead over existing data).
//
// Usage on a colDef:
//   { field: "directorate", cellEditor: AutocompleteCellEditor,
//     cellEditorParams: { values: rowData.map(r => r.directorate) } }
//
// AG Grid's functional cell editor contract: this component gets `value`
// (current cell value) and must call `onValueChange` with the latest text on
// every keystroke — whatever was last passed there is what AG Grid commits
// when editing stops (Enter/Tab/blur/click-away), there's no separate
// "confirm" step to wire up beyond that.
const MAX_SUGGESTIONS = 8;

export default function AutocompleteCellEditor(props) {
    const { value, onValueChange, eventKey, values = [], stopEditing } = props;

    // If editing started by typing a printable character directly (not
    // double-click/F2), that character replaces the old value — matching
    // every other cell editor in this grid.
    const startedByTyping = eventKey && eventKey.length === 1;
    const [text, setText] = useState(startedByTyping ? eventKey : (value ?? ''));
    const [highlighted, setHighlighted] = useState(-1);
    // The dropdown's on-screen position, in fixed-viewport coordinates — see
    // the portal note below for why this is needed at all.
    const [dropdownRect, setDropdownRect] = useState(null);
    const inputRef = useRef(null);
    const wrapperRef = useRef(null);

    useEffect(() => {
        onValueChange(text);
        inputRef.current?.focus();
        if (!startedByTyping) {
            inputRef.current?.select();
        }
        if (wrapperRef.current) {
            const rect = wrapperRef.current.getBoundingClientRect();
            setDropdownRect({ top: rect.bottom, left: rect.left, width: rect.width });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const suggestions = useMemo(() => {
        const term = text.trim().toLowerCase();
        const unique = Array.from(new Set(values.filter((v) => v !== null && v !== undefined && v !== '')));
        // Deliberately does NOT exclude a value equal to the current text —
        // double-clicking an already-filled cell (e.g. Directorate) starts
        // `text` at that cell's own value, and most values in a coded column
        // are shared by many rows. Excluding the exact match meant the
        // dropdown showed nothing at all until you typed something that
        // diverged from every existing value, which read as "autocomplete is
        // broken" rather than "there's nothing new to suggest yet."
        const pool = term
            ? unique.filter((v) => String(v).toLowerCase().includes(term))
            : unique;
        return pool.slice(0, MAX_SUGGESTIONS);
    }, [text, values]);

    const commit = (val) => {
        setText(val);
        onValueChange(val);
        stopEditing();
    };

    const handleChange = (e) => {
        setText(e.target.value);
        onValueChange(e.target.value);
        setHighlighted(-1);
    };

    const handleKeyDown = (e) => {
        if (suggestions.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlighted((prev) => (prev + 1) % suggestions.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlighted((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        } else if ((e.key === 'Enter' || e.key === 'Tab') && highlighted >= 0) {
            e.preventDefault();
            commit(suggestions[highlighted]);
        } else if (e.key === 'Escape') {
            setHighlighted(-1);
        }
    };

    return (
        <div ref={wrapperRef} className="relative w-full h-full">
            <input
                ref={inputRef}
                type="text"
                value={text}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                className="w-full h-full px-2 outline-none border-none bg-white"
            />
            {/* AG Grid's own cell wrapper sets overflow:hidden (it needs that
                for normal text truncation), which silently clipped this
                dropdown to a sliver when it was a plain in-flow child — a
                portal to <body>, positioned with the cell's real screen
                coordinates, escapes that clipping entirely. */}
            {suggestions.length > 0 && dropdownRect && createPortal(
                <ul
                    style={{ position: 'fixed', top: dropdownRect.top, left: dropdownRect.left, minWidth: dropdownRect.width }}
                    className="z-[9999] w-max max-w-xs bg-white border border-outline-variant rounded-b-lg shadow-lg max-h-48 overflow-y-auto"
                >
                    {suggestions.map((s, i) => (
                        <li
                            key={s}
                            onMouseDown={(e) => { e.preventDefault(); commit(s); }}
                            className={`px-2 py-1.5 text-sm cursor-pointer truncate ${i === highlighted ? 'bg-primary-container text-on-primary-container' : 'hover:bg-surface-container'}`}
                        >
                            {s}
                        </li>
                    ))}
                </ul>,
                document.body
            )}
        </div>
    );
}
