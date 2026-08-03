import { useState } from "react";
import { Head, usePage, Link } from "@inertiajs/react";
import axios from "axios";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout.jsx";
import StatCard from "@/Components/StatCard.jsx";
import BarChartVersionCompare from "@/Components/BarChartVersionCompare.jsx";
import { Spinner } from "@/Components/Spinner.jsx";

const STATUS_STYLES = {
    added: "bg-[#e6fff1] text-[#006545] border-[#c3f0d8]",
    removed: "bg-[#ffe9e9] text-[#a3231f] border-[#f5c6c6]",
    changed: "bg-[#fff7e0] text-[#8a6100] border-[#f0dfa8]",
    unchanged: "bg-surface-container-high text-on-surface-variant border-outline-variant",
};

export default function Compare() {
    const { year, versions, comparison: initialComparison } = usePage().props;
    const [comparison, setComparison] = useState(initialComparison);
    const [versionA, setVersionA] = useState(initialComparison.version_a);
    const [versionB, setVersionB] = useState(initialComparison.version_b);
    const [loading, setLoading] = useState(false);

    const currency = (value) =>
        `$${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

    const percent = (value) => (value === null || value === undefined ? "—" : `${value > 0 ? "+" : ""}${value}%`);

    const reload = async (nextA, nextB) => {
        setLoading(true);
        try {
            const response = await axios.get(`/budgets-compare/${year}`, {
                params: { version_a: nextA, version_b: nextB },
            });
            setComparison(response.data.comparison);
        } finally {
            setLoading(false);
        }
    };

    const handleVersionAChange = (e) => {
        const next = e.target.value;
        setVersionA(next);
        reload(next, versionB);
    };

    const handleVersionBChange = (e) => {
        const next = e.target.value;
        setVersionB(next);
        reload(versionA, next);
    };

    const { rows, totals, yearly_totals: yearlyTotals } = comparison;

    return (
        <AuthenticatedLayout>
            <Head title="Compare Budget Versions" />

            <div className="space-y-stack-md">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
                    <div>
                        <nav className="flex items-center text-on-surface-variant text-xs mb-2 gap-1">
                            <Link href={`/budgets/${year}`} className="hover:text-primary">Budgets {year}</Link>
                            <span className="material-symbols-outlined text-sm">chevron_right</span>
                            <span className="text-primary font-bold">Compare Versions</span>
                        </nav>
                        <h2 className="font-headline-md text-headline-md text-on-surface">
                            Compare Versions — {year} to {parseInt(year) + 4}
                        </h2>
                    </div>
                    <div className="flex items-center gap-stack-sm">
                        <div className="flex items-center gap-2 px-3 py-2 bg-surface-container-high rounded-lg border border-outline-variant">
                            <span className="text-xs font-bold text-on-surface-variant">VERSION A:</span>
                            <select value={versionA} onChange={handleVersionAChange} className="bg-transparent border-none focus:ring-0 text-sm font-bold text-primary p-0">
                                {versions.map((ver) => (
                                    <option key={`a-${ver}`} value={ver}>{`v${ver}`}</option>
                                ))}
                            </select>
                        </div>
                        <span className="material-symbols-outlined text-on-surface-variant">arrow_forward</span>
                        <div className="flex items-center gap-2 px-3 py-2 bg-surface-container-high rounded-lg border border-outline-variant">
                            <span className="text-xs font-bold text-on-surface-variant">VERSION B:</span>
                            <select value={versionB} onChange={handleVersionBChange} className="bg-transparent border-none focus:ring-0 text-sm font-bold text-primary p-0">
                                {versions.map((ver) => (
                                    <option key={`b-${ver}`} value={ver}>{`v${ver}`}</option>
                                ))}
                            </select>
                        </div>
                        {loading && <Spinner color="text-primary" />}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-stack-md">
                    <StatCard value={currency(totals.cost_a)} label={`Cost — Version ${versionA}`} percentage="" percentageColor="" />
                    <StatCard value={currency(totals.cost_b)} label={`Cost — Version ${versionB}`} percentage={percent(totals.cost_a ? Math.round((totals.cost_delta / totals.cost_a) * 100) : null)} percentageColor={totals.cost_delta >= 0 ? "text-red-600" : "text-green-600"} />
                    <StatCard value={currency(totals.cash_a)} label={`Cash — Version ${versionA}`} percentage="" percentageColor="" />
                    <StatCard value={currency(totals.cash_b)} label={`Cash — Version ${versionB}`} percentage={percent(totals.cash_a ? Math.round((totals.cash_delta / totals.cash_a) * 100) : null)} percentageColor={totals.cash_delta >= 0 ? "text-red-600" : "text-green-600"} />
                </div>

                <BarChartVersionCompare yearlyTotals={yearlyTotals} versionA={versionA} versionB={versionB} year={year} />

                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
                    <div className="bg-primary px-container-padding py-4 flex items-center justify-between">
                        <h4 className="font-title-sm text-title-sm text-white font-bold">Project-Level Variance</h4>
                        <span className="text-[11px] text-white/80">Matched by SAP Code</span>
                    </div>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-surface-container-low border-b border-outline-variant">
                                    <th className="px-4 py-3 font-label-caps text-label-caps text-on-surface-variant uppercase">SAP Code</th>
                                    <th className="px-4 py-3 font-label-caps text-label-caps text-on-surface-variant uppercase">Project</th>
                                    <th className="px-4 py-3 font-label-caps text-label-caps text-on-surface-variant uppercase text-center">Status</th>
                                    <th className="px-4 py-3 font-label-caps text-label-caps text-on-surface-variant uppercase text-right">Cost Δ</th>
                                    <th className="px-4 py-3 font-label-caps text-label-caps text-on-surface-variant uppercase text-right">Cash Δ</th>
                                </tr>
                            </thead>
                            <tbody className="font-data-tabular text-data-tabular divide-y divide-outline-variant/30">
                                {rows.map((row) => (
                                    <tr key={row.sap_code} className="hover:bg-primary-container/5">
                                        <td className="px-4 py-3">{row.sap_code}</td>
                                        <td className="px-4 py-3">{row.project_title}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${STATUS_STYLES[row.status]}`}>
                                                {row.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={row.cost_delta > 0 ? "text-red-600" : row.cost_delta < 0 ? "text-green-600" : ""}>
                                                {currency(row.cost_delta)} ({percent(row.cost_delta_pct)})
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={row.cash_delta > 0 ? "text-red-600" : row.cash_delta < 0 ? "text-green-600" : ""}>
                                                {currency(row.cash_delta)} ({percent(row.cash_delta_pct)})
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {rows.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-on-surface-variant">
                                            No projects found for either version.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
