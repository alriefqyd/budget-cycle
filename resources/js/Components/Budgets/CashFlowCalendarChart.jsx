import { useMemo } from "react";
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { toNum } from "@/Utils/budgetForecast.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Sums month-level cost/cash across every project for the near-term years
// (the only years the backend flattens down to cost_M_YYYY/cash_M_YYYY) so a
// supervisor can see when capital demand actually peaks, instead of only
// seeing annual totals.
export default function CashFlowCalendarChart({ rowData, startYear, yearlyBudget }) {
    const { labels, cash, cost } = useMemo(() => {
        const years = [];
        for (let y = startYear; y < yearlyBudget; y++) years.push(y);

        const labels = [];
        const cash = [];
        const cost = [];
        years.forEach(year => {
            MONTHS.forEach((m, idx) => {
                const month = idx + 1;
                labels.push(`${m} ${year}`);
                let cashSum = 0;
                let costSum = 0;
                rowData.forEach(r => {
                    if (r.sap_code === 'Total') return;
                    cashSum += toNum(r[`cash_${month}_${year}`]);
                    costSum += toNum(r[`cost_${month}_${year}`]);
                });
                cash.push(cashSum / 1_000_000);
                cost.push(costSum / 1_000_000);
            });
        });
        return { labels, cash, cost };
    }, [rowData, startYear, yearlyBudget]);

    const data = {
        labels,
        datasets: [
            { label: 'Cash Out', data: cash, borderColor: '#007e7a', backgroundColor: 'rgba(0,126,122,0.15)', fill: true, tension: 0.3 },
            { label: 'Cost', data: cost, borderColor: '#e9b733', backgroundColor: 'rgba(233,183,51,0.12)', fill: true, tension: 0.3 },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            title: { display: true, text: 'Monthly Cash Flow Calendar (in million)', font: { size: 16 } },
            tooltip: { mode: 'index', intersect: false },
            legend: { position: 'top' },
            datalabels: { display: false },
        },
        scales: {
            x: { grid: { display: false } },
            y: { grid: { display: false }, title: { display: true, text: 'USD (million)' } },
        },
    };

    const hasData = cash.some(v => v > 0) || cost.some(v => v > 0);

    return (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
            {hasData ? (
                <Line options={options} data={data} />
            ) : (
                <p className="text-on-surface-variant text-body-sm py-12 text-center">No monthly data available for {startYear}–{yearlyBudget - 1}.</p>
            )}
        </div>
    );
}
