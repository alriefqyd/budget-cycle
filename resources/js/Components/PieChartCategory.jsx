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
    const defaultColors = [
        'rgb(255, 99, 132)',
        'rgb(54, 162, 235)',
        'rgb(255, 205, 86)'
    ]

    const data = {
        labels: dataChart.map((item) => item.label),
        datasets: [{
            label: 'Project Category',
            data: dataChart.map((item) => item.value),
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
                text: 'Project By Category',
                font: { size: 16 },
            },
            tooltip: {
                mode: 'index',
                intersect: false,
            },
            legend: {
                position: 'top',
                labels: {
                    generateLabels: function (chart) {
                        const data = chart.data;
                        if (data.labels.length && data.datasets.length) {
                            return data.labels.map((label, i) => ({
                                text: label,
                                fillStyle: data.datasets[0].backgroundColor[i],
                                index: i
                            }));
                        }
                        return [];
                    }
                }
            },
            datalabels: {
                color: 'black',
                font: { weight: 'bold', size: 12 },
                formatter: (value) => value.toLocaleString()
            }
        }
    };

    return (
        <div className={`grid grid-cols-1 md:grid-cols-${cols} gap-6 mb-6`}>
            <div className="md:col-span-6 bg-white rounded-xl p-6 shadow-lg">
                <div style={{ height: '500px' }} className="flex justify-center items-center">
                    <Pie data={data} options={options} />
                </div>
            </div>
        </div>
    );
}
