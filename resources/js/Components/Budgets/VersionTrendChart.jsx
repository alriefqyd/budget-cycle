import { useEffect, useState } from "react";
import axios from "axios";
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Spinner } from "@/Components/Spinner.jsx";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// Shows how the whole cycle's totals moved from one finalized version to the
// next — e.g. "total forecast crept up 15% between Version 1 and Version 3" —
// which the existing 2-version Compare page can't show since it only ever
// diffs exactly two versions at a time.
export default function VersionTrendChart({ year }) {
    const [trend, setTrend] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        axios.get(`/budgets-trend/${year}`)
            .then(res => { if (!cancelled) setTrend(res.data.trend); })
            .catch(() => { if (!cancelled) setError('Failed to load version trend.'); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [year]);

    if (loading) {
        return (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm flex items-center gap-2 text-on-surface-variant">
                <Spinner color="text-primary" /> Loading version trend...
            </div>
        );
    }

    if (error || !trend || trend.series.length === 0) {
        return (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
                <p className="text-on-surface-variant text-body-sm text-center py-8">{error || 'No version history yet for this cycle.'}</p>
            </div>
        );
    }

    const toM = (n) => n / 1_000_000;
    const labels = trend.series.map(s => `V${s.version}${s.approval_status === 'final' ? ' (Final)' : ''}`);

    const data = {
        labels,
        datasets: [
            { label: 'Approved CAR', data: trend.series.map(s => toM(s.total_car)), borderColor: '#007e7a', backgroundColor: '#007e7a', tension: 0.2 },
            { label: 'Actual to Date', data: trend.series.map(s => toM(s.total_actual)), borderColor: '#1E88E5', backgroundColor: '#1E88E5', tension: 0.2 },
            { label: 'Forecast', data: trend.series.map(s => toM(s.total_forecast)), borderColor: '#e9b733', backgroundColor: '#e9b733', tension: 0.2 },
            { label: 'Remaining CAR (5YP)', data: trend.series.map(s => toM(s.total_budget_5yp)), borderColor: '#a3231f', backgroundColor: '#a3231f', borderDash: [5, 5], tension: 0.2 },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            title: { display: true, text: 'Cycle Totals Across Versions (in million)', font: { size: 16 } },
            tooltip: { mode: 'index', intersect: false },
            legend: { position: 'top' },
            datalabels: { display: false },
        },
        scales: {
            x: { grid: { display: false } },
            y: { grid: { display: false }, title: { display: true, text: 'USD (million)' } },
        },
    };

    return (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
            <Line options={options} data={data} />
        </div>
    );
}
