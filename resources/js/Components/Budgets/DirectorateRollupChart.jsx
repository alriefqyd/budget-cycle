import { useMemo } from "react";
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { toNum } from "@/Utils/budgetForecast.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Groups the current budget cycle's projects by directorate so a supervisor
// can see which directorate is driving CAR usage, without eyeballing 600+
// rows in the main grid. CAR/Actual/Forecast are summed per directorate,
// in millions for readability.
export default function DirectorateRollupChart({ rowData, groupBy = 'directorate' }) {
    const { labels, car, actual, forecast } = useMemo(() => {
        const groups = {};
        rowData
            .filter(r => r.sap_code !== 'Total')
            .forEach(r => {
                const key = r[groupBy] || '(Unknown)';
                if (!groups[key]) groups[key] = { car: 0, actual: 0, forecast: 0 };
                groups[key].car += toNum(r.budget_car);
                groups[key].actual += toNum(r.actual_to_date);
                groups[key].forecast += toNum(r.forecast_cash);
            });

        const sortedKeys = Object.keys(groups).sort((a, b) => groups[b].car - groups[a].car);
        const toM = (n) => n / 1_000_000;
        return {
            labels: sortedKeys,
            car: sortedKeys.map(k => toM(groups[k].car)),
            actual: sortedKeys.map(k => toM(groups[k].actual)),
            forecast: sortedKeys.map(k => toM(groups[k].forecast)),
        };
    }, [rowData, groupBy]);

    const data = {
        labels,
        datasets: [
            { label: 'Approved CAR', data: car, backgroundColor: '#007e7a' },
            { label: 'Actual to Date', data: actual, backgroundColor: '#1E88E5' },
            { label: 'Forecast', data: forecast, backgroundColor: '#e9b733' },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            title: { display: true, text: `CAR vs Actual vs Forecast by ${groupBy === 'directorate' ? 'Directorate' : 'Owner Area'} (in million)`, font: { size: 16 } },
            tooltip: { mode: 'index', intersect: false },
            legend: { position: 'top' },
            datalabels: {
                anchor: 'end',
                align: 'top',
                color: '#0b1c30',
                font: { weight: 'bold', size: 10 },
                formatter: (value) => value >= 1 ? value.toFixed(1) : '',
            },
        },
        scales: {
            x: { grid: { display: false } },
            y: { grid: { display: false }, title: { display: true, text: 'USD (million)' } },
        },
    };

    return (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
            {labels.length > 0 ? (
                <Bar options={options} data={data} />
            ) : (
                <p className="text-on-surface-variant text-body-sm py-12 text-center">No data to break down yet.</p>
            )}
        </div>
    );
}
