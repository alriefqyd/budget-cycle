import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels'; // for module use

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartDataLabels);

export default function BarChartCostCash({dataChart, cols}) {
    const roundUp = (value, multiple) => Math.ceil(value / multiple) * multiple;
    const data = {
        labels: dataChart.label,
        datasets: [
            // Plan (2026–2030) - Left Axis
            {
                label: 'Cost',
                data: dataChart.cost,
                borderColor: 'green',
                backgroundColor: '#009199',
                yAxisID: 'approvedAxis',
                barThickness: 52,
            },
            // Approved (2026–2030) - Left Axis
            {
                label: 'Cash',
                data: dataChart.cash,
                borderColor: 'blue',
                backgroundColor: '#e9b733',
                yAxisID: 'approvedAxis',
                barThickness: 50,
            },
        ]
    };

    const options = {
        responsive: true,
        plugins: {
            title: {
                display: true,
                text: '5YP 2026–2030 Cost and Cash (in million)',
                font: {
                    size: 16,
                },
            },
            tooltip: {
                mode: 'index',
                intersect: false,
            },
            legend: {
                position: 'top',
                labels: {
                    generateLabels: function (chart) {
                        return chart.data.datasets
                            .filter(ds => !ds.skipLegend) // ⬅️ filter out datasets with skipLegend
                            .map((dataset, i) => {
                                return {
                                    text: dataset.label,
                                    fillStyle: dataset.backgroundColor,
                                    hidden: !chart.isDatasetVisible(i),
                                    datasetIndex: i
                                }
                            });
                    }
                }
            },
            datalabels: {
                anchor: 'end',
                align: 'start',
                offset: -20,
                color: 'black',
                font: {
                    weight: 'bold',
                    size: 12,

                },
                formatter: function (value) {
                    return value?.toLocaleString(); // Adds commas
                },
            },
        },
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false,
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Year',
                },
                categoryPercentage: 0.8,
                barPercentage: 0.9
            },
        },
    };

    return (
        <div className={`grid grid-cols-1 md:grid-cols-${cols} gap-6 mb-6`}>
            <div className="md:col-span-6 bg-white rounded-xl p-6 shadow-lg">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-bold">Budget Chart</h3>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                            <span className="text-green-500">▲</span> Budget Forecasting 2026–2030
                        </p>
                    </div>
                </div>
                <Bar options={options} data={data}/>
            </div>
        </div>
    )
}

