import { useState } from 'react';
import { Pie } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import ChartDataLabels from "chartjs-plugin-datalabels";
import EmptyChartState from '@/Components/EmptyChartState.jsx';
import { CHART_CHROME, CHART_BODY_HEIGHT } from '@/lib/chartTheme.js';

// Shared with StackedTrendByDirectorate.jsx so the same category reads the
// same color everywhere on the dashboard. 8 slots covers the largest known
// breakdown (the 8 `category` values) without folding most of them into
// "Other".
const CATEGORICAL = ['#007e7a', '#e9b733', '#94a3b8', '#8a6100', '#a3231f', '#1E88E5', '#6d28d9', '#059669'];

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend, ChartDataLabels);

const centerTotalPlugin = {
    id: 'centerTotal',
    afterDraw(chart) {
        if (chart.config.type !== 'pie' && chart.config.type !== 'doughnut') return;
        const { ctx, chartArea } = chart;
        const total = chart.data.datasets[0].data.reduce((sum, value) => sum + Number(value || 0), 0);
        const centerX = (chartArea.left + chartArea.right) / 2;
        const centerY = (chartArea.top + chartArea.bottom) / 2;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = CHART_CHROME.textPrimary;
        ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
        ctx.fillText(total.toLocaleString(undefined, { maximumFractionDigits: 0 }), centerX, centerY - 10);
        ctx.fillStyle = CHART_CHROME.muted;
        ctx.font = '600 11px system-ui, -apple-system, sans-serif';
        ctx.fillText(chart.options.plugins?.centerTotal?.label ?? 'TOTAL', centerX, centerY + 14);
        ctx.restore();
    }
};

// Only 3 original colors are available; beyond that, fold the smallest
// slices into "Other" instead of wrapping the palette (a repeated hue would
// make two different categories indistinguishable in the legend and ring).
const MAX_SLICES = CATEGORICAL.length;

export default function PieChartCategory({ dataChart, cols, year, title = 'Project Category', noun = 'category' }) {
    const [viewType, setViewType] = useState('count'); // "count" or "budget"
    const hasData = (dataChart ?? []).length > 0;

    // Decide which data to display based on selector
    const valueFor = (item) => viewType === 'count' ? item.value : item.budget;

    // Magnitude decides which categories are worth naming individually;
    // alphabetical order decides which color slot each one gets, so two
    // categories in the top set never collide on the same color and swapping
    // the view type (or a live data update) doesn't repaint everyone.
    // Labels come straight from a DB column and aren't guaranteed to be a
    // string (e.g. a stray "0" value groups/casts to the number 0 server-side) —
    // coerce before comparing so an unexpected value can't crash the chart.
    const ranked = [...(dataChart ?? [])].sort((a, b) => Number(valueFor(b) || 0) - Number(valueFor(a) || 0));
    const topItems = ranked.slice(0, MAX_SLICES).sort((a, b) => String(a.label ?? '').localeCompare(String(b.label ?? '')));
    const otherItems = ranked.slice(MAX_SLICES);

    const labels = [...topItems.map((item) => item.label), ...(otherItems.length > 0 ? ['Other'] : [])];
    const chartValues = [
        ...topItems.map((item) => Number(valueFor(item) || 0)),
        ...(otherItems.length > 0 ? [otherItems.reduce((sum, item) => sum + Number(valueFor(item) || 0), 0)] : []),
    ];
    const colors = [
        ...topItems.map((_, i) => CATEGORICAL[i]),
        ...(otherItems.length > 0 ? [CHART_CHROME.muted] : []),
    ];

    const data = {
        labels,
        datasets: [{
            label: viewType === 'count' ? 'Total Projects' : 'Total Budget',
            data: chartValues,
            backgroundColor: colors,
            borderColor: '#fcfcfb',
            borderWidth: 2,
            hoverOffset: 6,
        }]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
            title: { display: false },
            tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {
                    label: function (context) {
                        let value = context.raw;
                        return viewType === 'count'
                            ? `${value} projects`
                            : `$ ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                    }
                }
            },
            legend: {
                position: 'left',
                labels: {
                    usePointStyle: true,
                    boxWidth: 10,
                    boxHeight: 10,
                    font: { size: 12, weight: '600' },
                    generateLabels: function (chart) {
                        const data = chart.data;
                        if (data.labels.length && data.datasets.length) {
                            const dataset = data.datasets[0];
                            return data.labels.map((label, i) => {
                                const value = dataset.data[i];
                                return {
                                    text: `${label} - ${viewType === 'count'
                                        ? value.toLocaleString() + ' projects'
                                        : '$' + value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                                    fillStyle: dataset.backgroundColor[i],
                                    strokeStyle: dataset.backgroundColor[i],
                                    index: i
                                };
                            });
                        }
                        return [];
                    }
                },
            },
            datalabels: { display: false },
            centerTotal: { label: viewType === 'count' ? 'PROJECTS' : 'TOTAL BUDGET' },
        }
    };

    return (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="font-title-sm text-title-sm text-on-surface">{title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="w-2 h-2 rounded-full bg-primary"></span>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                            {viewType === 'count' ? `Projects by ${noun}` : `Cash budget by ${noun} · in million`}
                        </p>
                    </div>
                </div>
                <select
                    value={viewType}
                    onChange={(e) => setViewType(e.target.value)}
                    className="bg-surface-container-low border-none rounded-lg text-xs font-label-caps focus:ring-1 focus:ring-primary"
                >
                    <option value="count">Total Projects</option>
                    <option value="budget">Total Budget</option>
                </select>
            </div>

            <div style={{ height: `${CHART_BODY_HEIGHT}px` }} className="flex justify-center items-center">
                {hasData ? (
                    <Pie
                        data={data}
                        options={options}
                        plugins={[centerTotalPlugin]}
                    />
                ) : (
                    <EmptyChartState year={year} />
                )}
            </div>
        </div>
    );
}
