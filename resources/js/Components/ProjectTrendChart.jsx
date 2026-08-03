import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import EmptyChartState from '@/Components/EmptyChartState.jsx';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartDataLabels);

export default function ProjectTrendChart({ project, startYear, endYear }) {
    if (!project) {
        return null;
    }

    const years = [];
    for (let year = startYear; year <= endYear; year++) {
        years.push(year);
    }

    const costSeries = years.map((year) => Number(project[`cost_${year}`] || 0));
    const cashSeries = years.map((year) => Number(project[`cash_${year}`] || 0));

    const hasData = [costSeries, cashSeries].some((arr) => arr.some((value) => value > 0));

    const data = {
        labels: years,
        datasets: [
            { label: 'Cost', data: costSeries, backgroundColor: '#009199', barThickness: 64 },
            { label: 'Cash', data: cashSeries, backgroundColor: '#e9b733', barThickness: 60 },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            title: {
                display: true,
                text: `${project.project_title} (${project.sap_code}) — Cost & Cash by Year`,
                font: { size: 18 },
                padding: { bottom: 20 },
            },
            legend: { position: 'top', labels: { font: { size: 13 } } },
            datalabels: {
                anchor: 'end',
                align: 'start',
                offset: -20,
                color: 'black',
                font: { weight: 'bold', size: 13 },
                formatter: (value) => value?.toLocaleString(),
            },
        },
        scales: {
            x: { grid: { display: false }, title: { display: true, text: 'Year' }, ticks: { font: { size: 13 } } },
            y: { grid: { display: false }, ticks: { font: { size: 13 } } },
        },
    };

    return (
        <div className="p-8">
            {hasData ? (
                <div className="h-[560px]">
                    <Bar options={options} data={data} />
                </div>
            ) : (
                <EmptyChartState message="No cost/cash data yet" subMessage="This project has no cash or cost figures across its 5-year span." />
            )}
        </div>
    );
}
