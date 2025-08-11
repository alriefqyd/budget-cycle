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

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend, ChartDataLabels);

export default function PieChartCategory({ dataChart, cols }) {
    const [viewType, setViewType] = useState('count'); // "count" or "budget"

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
                text: viewType === 'count' ? 'Project By Category' : 'Budget By Category',
                font: { size: 16 },
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
                position: 'side',
                labels: {
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
        <div className={`grid grid-cols-1 md:grid-cols-${cols} gap-6 mb-6`}>
            <div className="md:col-span-6 bg-white rounded-xl p-6 shadow-lg">

                {/* Dropdown selector */}
                <div className="mb-4">
                    <label className="mr-2 font-semibold">View:</label>
                    <select
                        value={viewType}
                        onChange={(e) => setViewType(e.target.value)}
                        className="border rounded p-2 w-full md:w-1/5"
                    >
                        <option value="count">Total Projects</option>
                        <option value="budget">Total Budget</option>
                    </select>
                </div>

                <div style={{ height: '500px' }} className="flex justify-center items-center">
                    <Pie data={data} options={options} />
                </div>
            </div>
        </div>
    );
}
