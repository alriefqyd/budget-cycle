import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import EmptyChartState from '@/Components/EmptyChartState.jsx';
import { CHART_CHROME, CHART_BODY_HEIGHT, formatMillions, legendPointStyle } from '@/lib/chartTheme.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartDataLabels);

const SERIES_COST = '#009199';
const SERIES_CASH = '#e9b733';

export default function BarChartCostCash({dataChart, cols, year}) {
    const hasData = [dataChart.cost, dataChart.cash]
        .some(arr => (arr ?? []).some(value => Number(value) > 0));

    const totalCost = (dataChart.cost ?? []).reduce((sum, value) => sum + Number(value || 0), 0);
    const totalCash = (dataChart.cash ?? []).reduce((sum, value) => sum + Number(value || 0), 0);

    const roundUp = (value, multiple) => Math.ceil(value / multiple) * multiple;
    const maxAxis = roundUp(Math.max(0, ...(dataChart.cost ?? []), ...(dataChart.cash ?? [])) * 1.2, 10);

    const data = {
        labels: dataChart.label,
        datasets: [
            {
                label: 'Cost',
                data: dataChart.cost,
                backgroundColor: SERIES_COST,
                borderRadius: 4,
                borderSkipped: false,
                maxBarThickness: 40,
            },
            {
                label: 'Cash',
                data: dataChart.cash,
                backgroundColor: SERIES_CASH,
                borderRadius: 4,
                borderSkipped: false,
                maxBarThickness: 40,
            },
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
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
                labels: legendPointStyle,
            },
            datalabels: {
                anchor: 'end',
                align: 'end',
                offset: 2,
                color: CHART_CHROME.textSecondary,
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
                grid: { color: CHART_CHROME.grid },
                ticks: { display: false },
            },
        },
    };

    return (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-stack-md mb-stack-md">
                <div>
                    <h3 className="font-title-sm text-title-sm text-on-surface">Cost vs Cash</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="w-2 h-2 rounded-full bg-primary"></span>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">5YP Cost and Cash · in million</p>
                    </div>
                </div>

                {hasData && (
                    <div className="flex items-center gap-3">
                        <div className="px-4 py-2 rounded-lg bg-surface-container-low border border-outline-variant min-w-[140px]">
                            <p className="font-label-caps text-label-caps text-on-surface-variant" style={{color: SERIES_COST}}>
                                Total Cost
                            </p>
                            <p className="font-data-tabular text-lg font-bold text-on-surface tabular-nums">
                                {formatMillions(totalCost)} M
                            </p>
                        </div>
                        <div className="px-4 py-2 rounded-lg bg-surface-container-low border border-outline-variant min-w-[140px]">
                            <p className="font-label-caps text-label-caps text-on-surface-variant" style={{color: SERIES_CASH}}>
                                Total Cash
                            </p>
                            <p className="font-data-tabular text-lg font-bold text-on-surface tabular-nums">
                                {formatMillions(totalCash)} M
                            </p>
                        </div>
                    </div>
                )}
            </div>
            {hasData ? (
                <div style={{ height: `${CHART_BODY_HEIGHT}px` }}>
                    <Bar options={options} data={data}/>
                </div>
            ) : (
                <EmptyChartState year={year} />
            )}
        </div>
    )
}
