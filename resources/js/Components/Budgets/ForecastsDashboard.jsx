import { useState } from "react";
import ExceptionList from "@/Components/Budgets/ExceptionList.jsx";
import DirectorateRollupChart from "@/Components/Budgets/DirectorateRollupChart.jsx";
import CashFlowCalendarChart from "@/Components/Budgets/CashFlowCalendarChart.jsx";
import VersionTrendChart from "@/Components/Budgets/VersionTrendChart.jsx";

// Analytics view for the "Forecasts" tab — a supervisor-facing read-only
// rollup of the current cycle, separate from the row-by-row editable grid in
// the other two tabs. Everything here is derived from the already-loaded
// rowData except the version trend, which needs its own version-spanning
// backend query (see ProjectsService::getVersionTrend).
export default function ForecastsDashboard({ rowData, startYear, yearlyBudget, year, onSelectProject }) {
    const [groupBy, setGroupBy] = useState('directorate');

    return (
        <div className="p-6 space-y-6">
            <section>
                <h3 className="font-title-sm text-title-sm text-on-surface mb-3">Needs Attention</h3>
                <ExceptionList rowData={rowData} onSelectProject={onSelectProject} />
            </section>

            <section>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-title-sm text-title-sm text-on-surface">CAR Usage by Group</h3>
                    <div className="inline-flex rounded-lg border border-outline-variant overflow-hidden text-body-sm">
                        <button
                            onClick={() => setGroupBy('directorate')}
                            className={`px-3 py-1.5 ${groupBy === 'directorate' ? 'bg-primary text-on-primary' : 'bg-surface text-on-surface-variant hover:bg-surface-container'}`}
                        >
                            Directorate
                        </button>
                        <button
                            onClick={() => setGroupBy('owner_area')}
                            className={`px-3 py-1.5 ${groupBy === 'owner_area' ? 'bg-primary text-on-primary' : 'bg-surface text-on-surface-variant hover:bg-surface-container'}`}
                        >
                            Owner Area
                        </button>
                    </div>
                </div>
                <DirectorateRollupChart rowData={rowData} groupBy={groupBy} />
            </section>

            <section>
                <h3 className="font-title-sm text-title-sm text-on-surface mb-3">Cash Flow Calendar</h3>
                <CashFlowCalendarChart rowData={rowData} startYear={startYear} yearlyBudget={yearlyBudget} />
            </section>

            <section>
                <h3 className="font-title-sm text-title-sm text-on-surface mb-3">Trend Across Versions</h3>
                <VersionTrendChart year={year} />
            </section>
        </div>
    );
}
