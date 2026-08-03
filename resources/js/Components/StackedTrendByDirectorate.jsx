import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import EmptyChartState from '@/Components/EmptyChartState.jsx';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const PALETTE = ['#007e7a', '#e9b733', '#94a3b8', '#8a6100', '#a3231f', '#1E88E5', '#6d28d9', '#059669'];

export default function StackedTrendByDirectorate({ dataChart, year }) {
    const series = dataChart?.series ?? {};
    const labels = dataChart?.years ?? [];
    const directorates = Object.keys(series);

    const hasData = directorates.some((key) => (series[key] ?? []).some((value) => Number(value) > 0));

    const data = {
        labels,
        datasets: directorates.map((directorate, index) => ({
            label: directorate,
            data: series[directorate],
            backgroundColor: PALETTE[index % PALETTE.length],
            stack: 'directorate',
        })),
    };

    const options = {
        responsive: true,
        plugins: {
            title: {
                display: true,
                text: '5-Year Cash Trend by Directorate (in million)',
                font: { size: 16 },
            },
            tooltip: { mode: 'index', intersect: false },
            legend: { position: 'top' },
        },
        scales: {
            x: {
                stacked: true,
                grid: { display: false },
                title: { display: true, text: 'Year' },
            },
            y: {
                stacked: true,
                grid: { display: false },
                title: { display: true, text: 'Cash (in million)' },
            },
        },
    };

    return (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="font-title-sm text-title-sm text-on-surface">Directorate Trend</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="w-2 h-2 rounded-full bg-primary"></span>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">Cash by directorate across the 5-year plan</p>
                    </div>
                </div>
            </div>
            {hasData ? (
                <Bar options={options} data={data} />
            ) : (
                <EmptyChartState year={year} />
            )}
        </div>
    );
}
