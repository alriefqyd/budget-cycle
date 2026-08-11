import {router} from "@inertiajs/react";

export default function RowTable(props) {

    const {budget, item, url} = props

    const currency = (value) =>
        `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const compactCurrency = (value) =>
        `$${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value || 0))}`;

    const years = Array.from(
        new Set(item.costCashYearlies.map(({ year }) => year))
    ).sort((a, b) => a - b);

    const amountFor = (year, type) =>
        item.costCashYearlies.find((row) => row.year === year && row.type === type)?.amount ?? 0;

    return (
        <tr
            onClick={() => router.visit(url)}
            className="hover:bg-primary-container/5 cursor-pointer transition-colors group"
        >
            <td className="px-6 py-5 font-bold text-primary text-center border-r border-outline-variant/30">
                {budget} - {parseInt(budget) + 4}
            </td>
            <td className="px-6 py-5 text-right">
                <div className="inline-block px-3 py-1.5 bg-[#e6fff1] text-[#006545] rounded-md font-bold shadow-sm border border-[#c3f0d8] group-hover:scale-105 transition-transform">
                    {currency(item.total_cash)}
                </div>
            </td>
            <td className="px-6 py-5 text-right">
                <div className="inline-block px-3 py-1.5 bg-[#e5f1ff] text-[#005c99] rounded-md font-bold shadow-sm border border-[#cce5ff] group-hover:scale-105 transition-transform">
                    {currency(item.total_cost)}
                </div>
            </td>
            <td className="px-6 py-5 text-right">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-secondary-container text-on-secondary-fixed border border-secondary">
                    {item.status}
                </span>
            </td>
            <td className="px-6 py-5">
                <table className="mx-auto border-collapse font-data-tabular text-data-tabular">
                    <thead>
                        <tr>
                            <th className="px-2 py-0.5 text-[10px]" />
                            {years.map((year) => (
                                <th
                                    key={year}
                                    className="px-2 py-0.5 text-[10px] font-label-caps text-on-surface-variant text-right"
                                >
                                    {year}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="px-2 py-0.5 text-[10px] font-label-caps text-[#006545] text-left whitespace-nowrap">
                                Cash
                            </td>
                            {years.map((year) => (
                                <td
                                    key={`cash-${year}`}
                                    title={currency(amountFor(year, 'cash'))}
                                    className="px-2 py-0.5 text-[11px] text-right text-on-surface tabular-nums whitespace-nowrap"
                                >
                                    {compactCurrency(amountFor(year, 'cash'))}
                                </td>
                            ))}
                        </tr>
                        <tr className="border-t border-outline-variant/30">
                            <td className="px-2 py-0.5 text-[10px] font-label-caps text-[#005c99] text-left whitespace-nowrap">
                                Cost
                            </td>
                            {years.map((year) => (
                                <td
                                    key={`cost-${year}`}
                                    title={currency(amountFor(year, 'cost'))}
                                    className="px-2 py-0.5 text-[11px] text-right text-on-surface tabular-nums whitespace-nowrap"
                                >
                                    {compactCurrency(amountFor(year, 'cost'))}
                                </td>
                            ))}
                        </tr>
                        <tr className="border-t border-outline-variant/30">
                            <td className="px-2 py-0.5 text-[10px] font-label-caps text-[#3730a3] text-left whitespace-nowrap">
                                Commitment
                            </td>
                            {years.map((year) => (
                                <td
                                    key={`commitment-${year}`}
                                    title={currency(amountFor(year, 'commitment'))}
                                    className="px-2 py-0.5 text-[11px] text-right text-on-surface tabular-nums whitespace-nowrap"
                                >
                                    {compactCurrency(amountFor(year, 'commitment'))}
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </td>
        </tr>
    )
}
