import {router} from "@inertiajs/react";

export default function RowTable(props) {

    const {budget, item, url} = props

    const currency = (value) =>
        `$${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

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
                <div className="flex flex-col gap-2 items-center">
                    <div className="flex flex-wrap gap-1 justify-center">
                        {item.costCashYearlies
                            .filter(({ type }) => type === 'cash')
                            .map(({ year, amount }) => (
                                <span
                                    key={`cash-${year}`}
                                    className="text-[10px] font-label-caps bg-tertiary-container/10 text-tertiary-container px-2 py-0.5 rounded"
                                >
                                    {year}: {currency(amount)}
                                </span>
                            ))}
                    </div>
                    <div className="flex flex-wrap gap-1 justify-center">
                        {item.costCashYearlies
                            .filter(({ type }) => type === 'cost')
                            .map(({ year, amount }) => (
                                <span
                                    key={`cost-${year}`}
                                    className="text-[10px] font-label-caps bg-primary-container/10 text-primary px-2 py-0.5 rounded"
                                >
                                    {year}: {currency(amount)}
                                </span>
                            ))}
                    </div>
                </div>
            </td>
        </tr>
    )
}
