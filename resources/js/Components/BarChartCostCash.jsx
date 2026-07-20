import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels'; // for module use
import EmptyChartState from '@/Components/EmptyChartState.jsx';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartDataLabels);

export default function BarChartCostCash({dataChart, cols, year}) {
    const hasData = [dataChart.cost, dataChart.cash]
        .some(arr => (arr ?? []).some(value => Number(value) > 0));

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
                ticks: {
                    display: false
                },
                grid:{
                    display: false
                },
                title: {
                    display: true,
                    text: 'Investment',
                },
            },
        },
    };

    return (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="font-title-sm text-title-sm text-on-surface">Cost vs Cash</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="w-2 h-2 rounded-full bg-primary"></span>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">Cost and Cash (in million)</p>
                    </div>
                </div>
            </div>
            {hasData ? (
                <Bar options={options} data={data}/>
            ) : (
                <EmptyChartState year={year} />
            )}
        </div>
    )
}

