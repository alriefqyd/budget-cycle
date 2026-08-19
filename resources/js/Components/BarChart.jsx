import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import EmptyChartState from '@/Components/EmptyChartState.jsx';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartDataLabels);

const SERIES_PLAN = '#2a78d6';
const SERIES_PRIOR = '#9ca3af';

const formatMillions = (value) => {
    if (value == null || isNaN(value)) return '-';
    return Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function BarChart({dataChart, chartName, cols, year}) {
    // The backend appends a trailing '5YP' aggregate entry after the per-year values.
    const yearlyLabels = (dataChart.label ?? []).slice(0, -1);
    const yearlyPlan = (dataChart.plan ?? []).slice(0, -1);
    const yearlyApproved = (dataChart.approved ?? []).slice(0, -1);
    const totalPlan5yp = (dataChart.plan5yp ?? []).at(-1);
    const totalApproved5yp = (dataChart.approved5yp ?? []).at(-1);

    const hasData = [yearlyPlan, yearlyApproved].some(arr => arr.some(value => Number(value) > 0))
        || Number(totalPlan5yp) > 0 || Number(totalApproved5yp) > 0;

    const startYear = Number(year ?? dataChart.year ?? yearlyLabels[1] ?? new Date().getFullYear());
    const endYear = startYear + 4;
    const priorCycleStart = startYear - 1;
    const priorCycleEnd = endYear - 1;

    const data = {
        labels: yearlyLabels,
        datasets: [
            {
                label: `Prior Cycle ${priorCycleStart}-${priorCycleEnd}`,
                data: yearlyApproved,
                backgroundColor: SERIES_PRIOR,
                borderRadius: 4,
                borderSkipped: false,
                maxBarThickness: 40,
            },
            {
                label: `Plan ${startYear}-${endYear}`,
                data: yearlyPlan,
                backgroundColor: SERIES_PLAN,
                borderRadius: 4,
                borderSkipped: false,
                maxBarThickness: 40,
            },
        ]
    };

    const roundUp = (value, multiple) => Math.ceil(value / multiple) * multiple;
    const maxAxis = roundUp(Math.max(0, ...yearlyPlan, ...yearlyApproved) * 1.2, 10);

    const options = {
        responsive: true,
        plugins: {
            title: { display: false },
            tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {
                    label: (context) => `${context.dataset.label}: ${formatMillions(context.raw)} M`,
                },
            },
            legend: {
                position: 'top',
                align: 'start',
                labels: {
                    boxWidth: 10,
                    boxHeight: 10,
                    usePointStyle: true,
                    pointStyle: 'rectRounded',
                    font: { size: 12, weight: '600' },
                }
            },
            datalabels: {
                anchor: 'end',
                align: 'end',
                offset: 2,
                color: '#52514e',
                font: { weight: '600', size: 11 },
                formatter: (value) => value > 0 ? formatMillions(value) : '',
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
                border: { display: false },
                ticks: { font: { size: 12, weight: '600' } },
            },
            y: {
                beginAtZero: true,
                max: maxAxis || undefined,
                border: { display: false },
                grid: { color: '#e1e0d9' },
                ticks: { display: false },
            },
        },
    };

    return (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-stack-md mb-stack-md">
                <div>
                    <h3 className="font-title-sm text-title-sm text-on-surface">Sustaining Investment Highlights</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="w-2 h-2 rounded-full bg-tertiary"></span>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                            5YP {startYear}–{endYear} · Cash in million
                        </p>
                    </div>
                </div>

                {hasData && (
                    <div className="flex items-center gap-3">
                        <div className="px-4 py-2 rounded-lg bg-surface-container-low border border-outline-variant min-w-[140px]">
                            <p className="font-label-caps text-label-caps text-on-surface-variant" style={{color: SERIES_PLAN}}>
                                5YP Plan Total
                            </p>
                            <p className="font-data-tabular text-lg font-bold text-on-surface tabular-nums">
                                {formatMillions(totalPlan5yp)} M
                            </p>
                        </div>
                        <div className="px-4 py-2 rounded-lg bg-surface-container-low border border-outline-variant min-w-[140px]">
                            <p className="font-label-caps text-label-caps text-on-surface-variant" style={{color: SERIES_PRIOR}}>
                                Prior Cycle Total
                            </p>
                            <p className="font-data-tabular text-lg font-bold text-on-surface tabular-nums">
                                {formatMillions(totalApproved5yp)} M
                            </p>
                        </div>
                    </div>
                )}
            </div>
            {hasData ? (
                <Bar options={options} data={data}/>
            ) : (
                <EmptyChartState year={year} />
            )}
        </div>
    )
}
