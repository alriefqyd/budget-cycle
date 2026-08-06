import { useMemo, useState } from "react";
import { getCarVariance, getDistributionMismatch, formatCompact } from "@/Utils/budgetForecast.js";

// Surfaces the projects a supervisor actually needs to act on — over-CAR and
// distribution-mismatch rows — instead of making them scroll 600+ rows in the
// main grid to spot the ones with a colored badge.
export default function ExceptionList({ rowData, onSelectProject }) {
    const [filter, setFilter] = useState('over'); // 'over' | 'near' | 'mismatch'

    const rows = useMemo(() => {
        return rowData
            .filter(r => r.sap_code !== 'Total')
            .map(r => ({ data: r, variance: getCarVariance(r), mismatch: getDistributionMismatch(r) }));
    }, [rowData]);

    const overCar = rows.filter(r => r.variance.status === 'over');
    const nearLimit = rows.filter(r => r.variance.status === 'near');
    const mismatched = rows.filter(r => r.mismatch);

    const visible = filter === 'over' ? overCar : filter === 'near' ? nearLimit : mismatched;

    const tabs = [
        { key: 'over', label: 'Over CAR', count: overCar.length, color: 'text-error' },
        { key: 'near', label: 'Near Limit', count: nearLimit.length, color: 'text-amber-600' },
        { key: 'mismatch', label: 'Distribution Mismatch', count: mismatched.length, color: 'text-amber-600' },
    ];

    return (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
            <div className="flex items-center gap-6 px-6 pt-4 border-b border-outline-variant">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setFilter(tab.key)}
                        className={`pb-3 border-b-2 font-label-caps text-label-caps tracking-wide transition-colors ${
                            filter === tab.key ? 'border-primary text-primary font-bold' : 'border-transparent text-on-surface-variant hover:text-primary font-medium'
                        }`}
                    >
                        <span className={tab.count > 0 ? tab.color : ''}>{tab.label} ({tab.count})</span>
                    </button>
                ))}
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-outline-variant">
                {visible.length === 0 && (
                    <p className="px-6 py-8 text-center text-on-surface-variant text-body-sm">No projects in this bucket. Nothing needs attention here.</p>
                )}
                {visible.map(({ data, variance, mismatch }) => (
                    <button
                        key={data.id}
                        onClick={() => onSelectProject?.(data)}
                        className="w-full flex items-center justify-between gap-4 px-6 py-3 text-left hover:bg-surface-container transition-colors"
                    >
                        <div className="min-w-0">
                            <p className="font-medium text-on-surface truncate">{data.project_title}</p>
                            <p className="text-body-sm text-on-surface-variant">{data.sap_code} • {data.directorate} • {data.owner_area}</p>
                        </div>
                        <div className="shrink-0 text-right">
                            <p className="font-bold text-on-surface">
                                {variance.pct !== null ? `${variance.pct.toFixed(0)}%` : '—'}
                            </p>
                            <p className="text-body-sm text-on-surface-variant">
                                CAR {formatCompact(variance.budgetCar)} / Used {formatCompact(variance.used)}
                            </p>
                            {mismatch && <p className="text-body-sm text-amber-600">⚠ Distribution mismatch</p>}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
