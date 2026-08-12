import { useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import EmptyChartState from '@/Components/EmptyChartState.jsx';
import { CHART_CHROME, CHART_BODY_HEIGHT, formatMillions } from '@/lib/chartTheme.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartDataLabels);

// Shared with PieChartCategory.jsx / StackedTrendByDirectorate.jsx so the
// same category reads the same color everywhere on the dashboard.
const CATEGORICAL = ['#007e7a', '#e9b733', '#94a3b8', '#8a6100', '#a3231f', '#1E88E5', '#6d28d9', '#059669'];

export default function BarChartByGroup({ dataChart, year, title = 'Project Category', noun = 'category' }) {
    const [viewType, setViewType] = useState('count'); // "count" or "budget"
    const hasData = (dataChart ?? []).length > 0;

    const valueFor = (item) => viewType === 'count' ? item.value : item.budget;

    // Labels come straight from a DB column and aren't guaranteed to be a
    // string (e.g. a stray "0" value groups/casts to the number 0
    // server-side) — coerce before rendering so an unexpected value can't
    // crash the chart. Sorted descending so the biggest bars read left to right.
    const ranked = [...(dataChart ?? [])].sort((a, b) => Number(valueFor(b) || 0) - Number(valueFor(a) || 0));

    const labels = ranked.map((item) => String(item.label ?? ''));
    const values = ranked.map((item) => Number(valueFor(item) || 0));
    const colors = ranked.map((_, i) => CATEGORICAL[i % CATEGORICAL.length]);

    const data = {
        labels,
        datasets: [{
            label: viewType === 'count' ? 'Total Projects' : 'Total Budget',
            data: values,
            backgroundColor: colors,
            borderRadius: 4,
            borderSkipped: false,
            maxBarThickness: 56,
        }],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            title: { display: false },
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context) => viewType === 'count'
                        ? `${context.raw} projects`
                        : `$ ${formatMillions(context.raw)} M`,
                },
            },
            datalabels: {
                anchor: 'end',
                align: 'end',
                offset: 2,
                color: CHART_CHROME.textSecondary,
                font: { weight: '600', size: 11 },
                formatter: (value) => viewType === 'count' ? value : (value > 0 ? formatMillions(value) : ''),
            },
        },
        scales: {
            x: {
                grid: { display: false },
                border: { display: false },
                ticks: { font: { size: 11, weight: '600' }, maxRotation: 30, minRotation: 0 },
            },
            y: {
                beginAtZero: true,
                border: { display: false },
                grid: { color: CHART_CHROME.grid },
                ticks: { display: false },
            },
        },
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

            <div style={{ height: `${CHART_BODY_HEIGHT}px` }}>
                {hasData ? (
                    <Bar data={data} options={options} />
                ) : (
                    <EmptyChartState year={year} />
                )}
            </div>
        </div>
    );
}
