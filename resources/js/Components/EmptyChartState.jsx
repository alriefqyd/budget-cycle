export default function EmptyChartState({ year, message = "Data not available yet", subMessage }) {
    const resolvedSubMessage = subMessage
        ?? (year
            ? `Budget data for ${year} hasn't been submitted yet.`
            : "Budget data for this period hasn't been submitted yet.");

    return (
        <div className="flex flex-col items-center justify-center text-center py-16 px-6 text-on-surface-variant">
            <span className="material-symbols-outlined text-5xl opacity-40 mb-3">query_stats</span>
            <p className="font-title-sm text-title-sm text-on-surface">{message}</p>
            <p className="font-body-sm text-body-sm mt-1 max-w-sm">{resolvedSubMessage}</p>
        </div>
    );
}