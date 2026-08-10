import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import EmptyChartState from '@/Components/EmptyChartState.jsx';
import { CHART_CHROME, formatMillions, legendPointStyle } from '@/lib/chartTheme.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const CATEGORICAL = ['#007e7a', '#e9b733', '#94a3b8', '#8a6100', '#a3231f', '#1E88E5', '#6d28d9', '#059669'];

// Only 8 original colors are available; beyond that, fold the smallest
// series into "Other" instead of wrapping the palette (a repeated hue would
// make two different directorates indistinguishable).
const MAX_SERIES = CATEGORICAL.length;

// Per-segment value labels get unreadable once a bar has several stacked
// series — draw a single grand-total label above each bar's stack instead.
const stackTotalPlugin = {
    id: 'stackTotal',
    afterDatasetsDraw(chart) {
        const { ctx, chartArea, scales, data } = chart;
        const meta0 = chart.getDatasetMeta(0);
        if (!meta0?.data?.length) return;

        meta0.data.forEach((bar, index) => {
            const total = data.datasets.reduce((sum, ds) => sum + Number(ds.data[index] || 0), 0);
            if (total <= 0) return;

            const y = Math.max(scales.y.getPixelForValue(total) - 6, chartArea.top + 14);

            ctx.save();
            ctx.fillStyle = CHART_CHROME.textPrimary;
            ctx.font = '700 12px system-ui, -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(formatMillions(total), bar.x, y);
            ctx.restore();
        });
    },
};

export default function StackedTrendByDirectorate({ dataChart, year }) {
    const series = dataChart?.series ?? {};
    const labels = dataChart?.years ?? [];

    const totalsByDirectorate = Object.keys(series)
        .map((key) => ({
            key,
            total: (series[key] ?? []).reduce((sum, v) => sum + Number(v || 0), 0),
        }))
        .sort((a, b) => b.total - a.total);

    // Magnitude decides which directorates are worth naming individually;
    // alphabetical order decides which color slot each one gets. That way two
    // directorates in the top set never collide on the same color, and swapping
    // magnitude rank between them (e.g. after a version change) doesn't repaint
    // anything — only a directorate entering or leaving the top set does.
    const otherDirectorates = totalsByDirectorate.slice(MAX_SERIES).map((d) => d.key);
    const topDirectorates = totalsByDirectorate
        .slice(0, MAX_SERIES)
        .map((d) => d.key)
        .sort((a, b) => a.localeCompare(b));
    const directorates = otherDirectorates.length > 0 ? [...topDirectorates, 'Other'] : topDirectorates;

    const seriesFor = (key) => key === 'Other'
        ? labels.map((_, i) => otherDirectorates.reduce((sum, k) => sum + Number((series[k] ?? [])[i] || 0), 0))
        : (series[key] ?? []);

    const hasData = directorates.some((key) => seriesFor(key).some((value) => Number(value) > 0));
    const totalCash = totalsByDirectorate.reduce((sum, d) => sum + d.total, 0);

    const data = {
        labels,
        datasets: directorates.map((directorate, index) => ({
            label: directorate,
            data: seriesFor(directorate),
            backgroundColor: directorate === 'Other' ? CHART_CHROME.muted : CATEGORICAL[index],
            stack: 'directorate',
            borderRadius: 3,
            borderSkipped: false,
        })),
    };

    const options = {
        responsive: true,
        layout: { padding: { top: 24 } },
        plugins: {
            title: { display: false },
            datalabels: { display: false },
            tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {
                    label: (context) => `${context.dataset.label}: ${formatMillions(context.raw)} M`,
                },
            },
            legend: { position: 'top', align: 'start', labels: legendPointStyle },
        },
        scales: {
            x: {
                stacked: true,
                grid: { display: false },
                border: { display: false },
                ticks: { font: { size: 12, weight: '600' } },
            },
            y: {
                stacked: true,
                grid: { color: CHART_CHROME.grid },
                border: { display: false },
                ticks: {
                    font: { size: 11 },
                    callback: (value) => formatMillions(value),
                },
            },
        },
    };

    return (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-stack-md mb-stack-md">
                <div>
                    <h3 className="font-title-sm text-title-sm text-on-surface">Directorate Trend</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="w-2 h-2 rounded-full bg-primary"></span>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">Cash by directorate across the 5-year plan · in million</p>
                    </div>
                </div>
                {hasData && (
                    <div className="px-4 py-2 rounded-lg bg-surface-container-low border border-outline-variant min-w-[140px]">
                        <p className="font-label-caps text-label-caps text-on-surface-variant">5YP Total Cash</p>
                        <p className="font-data-tabular text-lg font-bold text-on-surface tabular-nums">
                            {formatMillions(totalCash)} M
                        </p>
                    </div>
                )}
            </div>
            {hasData ? (
                <Bar options={options} data={data} plugins={[stackTotalPlugin]} />
            ) : (
                <EmptyChartState year={year} />
            )}
        </div>
    );
}
