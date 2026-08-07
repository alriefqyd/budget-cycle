import { useMemo, useState } from "react"
import { Link, usePage } from "@inertiajs/react"
import Swal from "sweetalert2";

import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout.jsx"
import { Spinner } from "@/Components/Spinner.jsx";
import { computeBudget5YP, distributeAnnualBudget, distributeMonthlyCost } from "@/Utils/budgetForecast.js";

const formatCurrency = (value) => {
    if (value === null || value === undefined || value === '' || isNaN(value)) return '-';
    return Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function MyForecast() {
    const { budgets, year, budgetVersion, versions, auth } = usePage().props;
    const isViewer = auth.user.role === 'viewer';
    const startYear = parseInt(year);
    const endYear = startYear + 4;
    const yearlyBudget = startYear + 2;

    const [rows, setRows] = useState(budgets);
    const [pmFilter, setPmFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [savingId, setSavingId] = useState(null);

    const isFinal = budgetVersion?.approval_status === 'final';
    // This page always loads the latest version server-side (getBudgetsByYear
    // with no explicit version falls back to latest), so the only lock
    // condition that applies here is "final & approved".
    const editable = !isFinal && !isViewer;

    const pmList = useMemo(() => {
        const names = new Set(rows.map((r) => r.project_manager).filter(Boolean));
        return Array.from(names).sort();
    }, [rows]);

    const filteredRows = useMemo(() => {
        const term = search.trim().toLowerCase();
        return rows.filter((r) => {
            const matchesPm = pmFilter === 'all' || r.project_manager === pmFilter;
            const matchesSearch = !term
                || (r.project_title || '').toLowerCase().includes(term)
                || (r.sap_code || '').toLowerCase().includes(term);
            return matchesPm && matchesSearch;
        });
    }, [rows, pmFilter, search]);

    // Applies `patch` (the field the user just edited) and recomputes budget_5yp
    // + the annual (and, for near-term years, monthly) cost/cash distribution
    // from the merged row in one pass, then persists the whole thing — same
    // shared math as the main grid (see resources/js/Utils/budgetForecast.js).
    // Deliberately a single synchronous merge-then-recompute step rather than
    // "setState, then read state back" — React state updates aren't applied
    // synchronously, so reading `rows` again right after setting it would see
    // the pre-edit value and silently recompute+save the old numbers.
    const applyEditAndSave = (id, patch) => {
        const current = rows.find((r) => r.id === id);
        if (!current) return;

        const merged = { ...current, ...patch };
        const recomputed = { ...merged, ...computeBudget5YP(merged) };
        Object.assign(recomputed, distributeAnnualBudget(recomputed, startYear, endYear));

        const years = parseInt(recomputed.num_of_year_budget) || 1;
        const budgetPerYear = recomputed.budget_5yp > 0 ? recomputed.budget_5yp / years : 0;
        for (let y = startYear; y <= endYear; y++) {
            Object.assign(recomputed, distributeMonthlyCost(recomputed, budgetPerYear, y, yearlyBudget));
        }

        setRows((prev) => prev.map((r) => (r.id === id ? recomputed : r)));
        save(id, recomputed);
    };

    const save = async (id, recomputed) => {
        setSavingId(id);
        try {
            await axios.put(`/budgets/${id}`, { ...recomputed, year_period: startYear }, {
                headers: { Accept: 'application/json' },
            });
        } catch (error) {
            console.error('Failed to save forecast:', error);
            Swal.fire('Gagal menyimpan', error.response?.data?.message || 'Terjadi kesalahan, coba lagi.', 'error');
        } finally {
            setSavingId(null);
        }
    };

    const numberInput = (row, field, { min, max } = {}) => (
        <input
            type="number"
            step="0.01"
            disabled={!editable}
            defaultValue={row[field] ?? 0}
            onBlur={(e) => {
                const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                applyEditAndSave(row.id, { [field]: value });
            }}
            min={min}
            max={max}
            className="w-32 rounded-lg border border-outline-variant bg-surface px-2 py-1.5 text-right font-data-tabular text-data-tabular focus:ring-1 focus:ring-primary outline-none disabled:bg-surface-container disabled:text-on-surface-variant disabled:cursor-not-allowed"
        />
    );

    return (
        <AuthenticatedLayout>
            <div className="flex flex-col gap-stack-md">
                <nav className="flex items-center gap-2 text-on-surface-variant" aria-label="Breadcrumb">
                    <Link href={'/dashboard'} className="font-body-sm text-body-sm hover:text-primary transition-colors">Dashboard</Link>
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    <Link href={'/budgets'} className="font-body-sm text-body-sm hover:text-primary transition-colors">Budgets</Link>
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    <Link href={`/budgets/${startYear}`} className="font-body-sm text-body-sm hover:text-primary transition-colors">{startYear} - {endYear}</Link>
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    <span className="font-body-sm text-body-sm font-bold text-primary">Forecast Sederhana</span>
                </nav>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-stack-md">
                    <div>
                        <h2 className="font-headline-lg text-3xl font-bold text-on-surface tracking-tight">Forecast Sederhana</h2>
                        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                            Cek dan update forecast per project — isi berapa yang akan dipakai tahun ini &amp; tahun depan dari CAR yang sudah disetujui. Detail bulanan tetap diatur di{' '}
                            <Link href={`/budgets/${startYear}`} className="text-primary underline">halaman utama</Link>.
                        </p>
                    </div>
                    {isFinal && (
                        <span className="inline-flex items-center gap-2 px-stack-md py-2 bg-secondary-container text-on-secondary-container rounded-lg font-label-caps text-label-caps shrink-0">
                            <span className="material-symbols-outlined text-[18px]">lock</span>
                            Final &amp; Approved — read-only
                        </span>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-stack-sm">
                    <div className="relative">
                        <span className="material-symbols-outlined text-[18px] absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-60">search</span>
                        <input
                            type="text"
                            placeholder="Cari SAP code / judul project..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 pr-3 py-2 w-72 rounded-lg border border-outline-variant bg-surface text-body-sm focus:ring-1 focus:ring-primary outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-2 text-on-surface-variant">
                        <span className="font-label-caps text-label-caps">PM:</span>
                        <select
                            value={pmFilter}
                            onChange={(e) => setPmFilter(e.target.value)}
                            className="appearance-none bg-surface border border-outline-variant rounded-lg px-3 pr-8 py-2 font-label-caps text-label-caps focus:ring-1 focus:ring-primary outline-none"
                        >
                            <option value="all">Semua PM</option>
                            {pmList.map((pm) => (
                                <option key={pm} value={pm}>{pm}</option>
                            ))}
                        </select>
                    </div>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                        {filteredRows.length} dari {rows.length} project
                    </span>
                </div>

                <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden border border-outline-variant">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-primary-container/40 text-on-primary-container">
                                    <th className="px-4 py-3 font-label-caps text-label-caps whitespace-nowrap">SAP Code</th>
                                    <th className="px-4 py-3 font-label-caps text-label-caps min-w-[220px]">Project Title</th>
                                    <th className="px-4 py-3 font-label-caps text-label-caps whitespace-nowrap">PM</th>
                                    <th className="px-4 py-3 font-label-caps text-label-caps text-right whitespace-nowrap">CAR (Approved)</th>
                                    <th className="px-4 py-3 font-label-caps text-label-caps text-right whitespace-nowrap">Actual to Date</th>
                                    <th className="px-4 py-3 font-label-caps text-label-caps text-right whitespace-nowrap">Forecast Cost</th>
                                    <th className="px-4 py-3 font-label-caps text-label-caps text-right whitespace-nowrap">Forecast Cash</th>
                                    <th className="px-4 py-3 font-label-caps text-label-caps whitespace-nowrap">Start Year</th>
                                    <th className="px-4 py-3 font-label-caps text-label-caps whitespace-nowrap">Jumlah Tahun</th>
                                    <th className="px-4 py-3 font-label-caps text-label-caps text-right whitespace-nowrap">Sisa CAR (Cash)</th>
                                    <th className="px-4 py-3 w-8"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRows.map((row) => {
                                    // budget_5yp = CAR minus actual spend minus this forecast — the figure
                                    // this page keeps live. `cash_remaining` is a separate, main-grid-only
                                    // "did the yearly distribution add up" check that this page doesn't
                                    // recompute, so it must not be used here (it would show stale numbers).
                                    const remaining = row.budget_5yp;
                                    const remainingNegative = parseFloat(remaining) < 0;
                                    return (
                                        <tr key={row.id} data-row-id={row.id} className="border-t border-outline-variant hover:bg-surface-container-low/50">
                                            <td className="px-4 py-3 font-data-tabular text-data-tabular text-on-surface-variant">{row.sap_code || '-'}</td>
                                            <td className="px-4 py-3 font-body-sm text-body-sm text-on-surface font-medium">{row.project_title || '-'}</td>
                                            <td className="px-4 py-3 font-body-sm text-body-sm text-on-surface-variant">{row.project_manager || '#N/A'}</td>
                                            <td className="px-4 py-3 text-right font-data-tabular text-data-tabular text-on-surface-variant">{formatCurrency(row.budget_car)}</td>
                                            <td className="px-4 py-3 text-right font-data-tabular text-data-tabular text-on-surface-variant">{formatCurrency(row.actual_to_date)}</td>
                                            <td className="px-4 py-3 text-right">{numberInput(row, 'forecast_cost')}</td>
                                            <td className="px-4 py-3 text-right">{numberInput(row, 'forecast_cash')}</td>
                                            <td className="px-4 py-3">
                                                <select
                                                    disabled={!editable}
                                                    defaultValue={row.start_year}
                                                    onChange={(e) => applyEditAndSave(row.id, { start_year: e.target.value })}
                                                    className="rounded-lg border border-outline-variant bg-surface px-2 py-1.5 font-data-tabular text-data-tabular focus:ring-1 focus:ring-primary outline-none disabled:bg-surface-container disabled:cursor-not-allowed"
                                                >
                                                    {Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i).map((y) => (
                                                        <option key={y} value={y}>{y}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-4 py-3">
                                                <select
                                                    disabled={!editable}
                                                    defaultValue={row.num_of_year_budget}
                                                    onChange={(e) => applyEditAndSave(row.id, { num_of_year_budget: e.target.value })}
                                                    className="rounded-lg border border-outline-variant bg-surface px-2 py-1.5 font-data-tabular text-data-tabular focus:ring-1 focus:ring-primary outline-none disabled:bg-surface-container disabled:cursor-not-allowed"
                                                >
                                                    {Array.from({ length: endYear - parseInt(row.start_year || startYear) + 1 }, (_, i) => i + 1).map((n) => (
                                                        <option key={n} value={n}>{n}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className={`px-4 py-3 text-right font-data-tabular text-data-tabular font-bold ${remainingNegative ? 'text-error' : 'text-tertiary-container'}`}>
                                                {formatCurrency(remaining)}
                                            </td>
                                            <td className="px-4 py-3">
                                                {savingId === row.id && <Spinner color="text-primary" />}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredRows.length === 0 && (
                                    <tr>
                                        <td colSpan={11} className="px-4 py-10 text-center text-on-surface-variant font-body-sm text-body-sm">
                                            Tidak ada project yang cocok.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    )
}
