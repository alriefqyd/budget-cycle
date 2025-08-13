import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels'; // for module use

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartDataLabels);

export default function BarChart({dataChart, chartName, cols}) {
    const roundUp = (value, multiple) => Math.ceil(value / multiple) * multiple;
    const maxPlanAxisLeft = roundUp(Math.max(...dataChart.approved, ...dataChart.plan) + 20, 1);
    const maxPlanAxisRight = roundUp(Math.max(...dataChart.approved5yp, ...dataChart.plan5yp) + 20, 1);

    const data = {
        labels: dataChart.label,
        datasets: [
            // Plan (2026–2030) - Left Axis
            {
                label: 'Plan',
                data: dataChart.plan,
                borderColor: '#2CA6A4',
                backgroundColor:  'rgb(214,61,92)',
                yAxisID: 'approvedAxis',
                barThickness: 52,
            },
            // Approved (2026–2030) - Left Axis
            {
                label: 'Approved',
                data: dataChart.approved,
                borderColor: '#0D47A1',
                backgroundColor: 'rgb(34,133,200)',
                yAxisID: 'approvedAxis',
                barThickness: 50,
            },
            // Plan (5YP) - Right Axis
            {
                label: 'Plan (5YP)',
                skipLegend: true,
                data: dataChart.plan5yp,
                borderColor: '#2CA6A4',
                backgroundColor:  'rgb(214,61,92)',
                yAxisID: 'planAxis',
                barThickness: 50,

            },
            // Approved (5YP) - Right Axis
            {
                label: 'Approved (5YP)',
                skipLegend: true,
                data: dataChart.approved5yp,
                borderColor: '#0D47A1',
                backgroundColor: 'rgb(34,133,200)',
                yAxisID: 'planAxis',
                barThickness: 52,
            },
        ]
    };

    console.log(chartName)

    const options = {
        responsive: true,
        plugins: {
            title: {
                display: true,
                text: '5YP 2026–2030 Sustaining Investment Highlights (Cash in million)',
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
                            .filter(ds => !ds.skipLegend)
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
                grid:{
                    display: false
                },
                title: {
                    display: true,
                    text: 'Year',
                },
                categoryPercentage: 0.8,
                barPercentage: 0.9
            },
            approvedAxis: {
                type: 'linear',
                position: 'left',
                beginAtZero: true,
                max: maxPlanAxisLeft,
                title: {
                    display: true,
                    text: 'Investment',
                },
                ticks: {
                    display: false
                },
                grid:{
                    display: false
                }

            },
            planAxis: {
                type: 'linear',
                position: 'right',
                beginAtZero: true,
                max: maxPlanAxisRight,
                title: {
                    display: true,
                    text: '5YP Total',
                },
                ticks: {
                    display: false
                },
                grid: {
                    display: false,
                },
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

