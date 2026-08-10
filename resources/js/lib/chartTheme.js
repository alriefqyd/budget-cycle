// Shared, non-color Chart.js utilities reused across dashboard charts —
// series colors were reverted to each chart's own original per-component
// scheme, so only the neutral chrome (grid/ink) and formatters live here.

// Shared chart-body height so side-by-side cards (e.g. Cost vs Cash and
// Project Category) line up in the dashboard's 2-column row.
export const CHART_BODY_HEIGHT = 420;

export const CHART_CHROME = {
    grid: '#e1e0d9',
    axis: '#c3c2b7',
    textPrimary: '#0b0b0b',
    textSecondary: '#52514e',
    muted: '#898781',
};

export const formatMillions = (value) => {
    if (value == null || isNaN(value)) return '-';
    return Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const formatCurrency = (value) =>
    `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const legendPointStyle = {
    boxWidth: 10,
    boxHeight: 10,
    usePointStyle: true,
    pointStyle: 'rectRounded',
    font: { size: 12, weight: '600' },
};
