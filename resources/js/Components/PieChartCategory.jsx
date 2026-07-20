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

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend, ChartDataLabels);

export default function PieChartCategory({ dataChart, cols, year }) {
    const [viewType, setViewType] = useState('count'); // "count" or "budget"
    const hasData = (dataChart ?? []).length > 0;

    const defaultColors = [
        'rgb(255, 99, 132)',
        'rgb(54, 162, 235)',
        'rgb(255, 205, 86)',
    ];

    // Decide which data to display based on selector
    const chartValues = viewType === 'count'
        ? dataChart.map((item) => item.value)  // total project count
        : dataChart.map((item) => item.budget); // total budget per category

    const data = {
        labels: dataChart.map((item) => item.label),
        datasets: [{
            label: viewType === 'count' ? 'Total Projects' : 'Total Budget',
            data: chartValues,
            backgroundColor: dataChart.map((_, i) => defaultColors[i % defaultColors.length]),
            hoverOffset: 4
        }]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            title: {
                display: true,
                text: viewType === 'count' ? '2026 Project By Category' : '2026 Budget By Category (Cash in Million)',
                font: { size: 16 },
                padding: { bottom: 20 }
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {
                    label: function (context) {
                        let value = context.raw;
                        return viewType === 'count'
                            ? `${value} projects`
                            : `$ ${value.toLocaleString()}`;
                    }
                }
            },
            legend: {
                position: 'left',
                labels: {
                    usePointStyle:true,
                    generateLabels: function (chart) {
                        const data = chart.data;
                        if (data.labels.length && data.datasets.length) {
                            const dataset = data.datasets[0];
                            return data.labels.map((label, i) => {
                                const value = dataset.data[i];
                                return {
                                    text: `${label} - ${viewType === 'count'
                                        ? value.toLocaleString() + ' projects'
                                        : '$' + value.toLocaleString()}`,
                                    fillStyle: dataset.backgroundColor[i],
                                    index: i
                                };
                            });
                        }
                        return [];
                    }
                },
            },
            datalabels: {
                color: 'black',
                font: { weight: 'bold', size: 12 },
                formatter: (value) => viewType === 'count'
                    ? value.toLocaleString()
                    : `$ ${value.toLocaleString()}`,
            }
        }
    };

    return (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-title-sm text-title-sm text-on-surface">Project Category</h3>
                <select
                    value={viewType}
                    onChange={(e) => setViewType(e.target.value)}
                    className="bg-surface-container-low border-none rounded-lg text-xs font-label-caps focus:ring-1 focus:ring-primary"
                >
                    <option value="count">Total Projects</option>
                    <option value="budget">Total Budget</option>
                </select>
            </div>

            <div style={{ height: '500px' }} className="flex justify-center items-center">
                {hasData ? (
                    <Pie data={data} options={options} />
                ) : (
                    <EmptyChartState year={year} />
                )}
            </div>
        </div>
    );
}
