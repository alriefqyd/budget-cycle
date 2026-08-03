import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import EmptyChartState from '@/Components/EmptyChartState.jsx';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartDataLabels);

export default function BarChartVersionCompare({ yearlyTotals, versionA, versionB, year }) {
    const toMillions = (value) => Number(value || 0) / 1000000;

    const labels = (yearlyTotals ?? []).map((row) => row.year);
    const totalA = (yearlyTotals ?? []).map((row) => toMillions(Number(row.cost_a) + Number(row.cash_a)));
    const totalB = (yearlyTotals ?? []).map((row) => toMillions(Number(row.cost_b) + Number(row.cash_b)));

    const hasData = [totalA, totalB].some((arr) => arr.some((value) => Number(value) > 0));

    const data = {
        labels,
        datasets: [
            {
                label: `Version ${versionA}`,
                data: totalA,
                backgroundColor: '#94a3b8',
                barThickness: 52,
            },
            {
                label: `Version ${versionB}`,
                data: totalB,
                backgroundColor: '#007e7a',
                barThickness: 50,
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            title: {
                display: true,
                text: `Version ${versionA} vs Version ${versionB} — Total Investment by Year (in million)`,
                font: { size: 16 },
            },
            tooltip: {
                mode: 'index',
                intersect: false,
            },
            legend: {
                position: 'top',
            },
            datalabels: {
                anchor: 'end',
                align: 'start',
                offset: -20,
                color: 'black',
                font: { weight: 'bold', size: 12 },
                formatter: (value) => value?.toLocaleString(),
            },
        },
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false,
        },
        scales: {
            x: {
                grid: { display: false },
                title: { display: true, text: 'Year' },
                categoryPercentage: 0.8,
                barPercentage: 0.9,
            },
            y: {
                grid: { display: false },
                title: { display: true, text: 'Investment' },
            },
        },
    };

    return (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="font-title-sm text-title-sm text-on-surface">Version Comparison</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="w-2 h-2 rounded-full bg-primary"></span>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">Total cost + cash by year (in million)</p>
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
