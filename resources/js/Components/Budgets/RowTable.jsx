import {router, usePage} from "@inertiajs/react";
import {useEffect} from "react";

export default function RowTable(props) {

    const {budget, item} = props
    let collectBudgetYear = [];


    let result = {};

    collectBudgetYear.forEach(({ year, amount, type }) => {
        if (!result[year]) {
            result[year] = { year, cost: 0, cash: 0 };
        }
        result[year][type] += amount;
    });

    return (
        <tr key={props.budget.id}  onClick={() => router.visit(props.url)} className="odd:bg-white cursor-pointer even:bg-gray-50 hover:bg-yellow-50 transition duration-150">
            <td className="px-4 py-3 text-center font-medium">{budget} - {parseInt(budget) + 4}</td>
            <td className="px-4 py-3 text-right font-semibold">$ {item.total_cash.toLocaleString()}</td>
            <td className="px-4 py-3 text-right font-semibold">$ {item.total_cost.toLocaleString()}</td>
            <td className="px-4 py-3 text-right font-semibold">Approved / On Going</td>
            <td className="px-4 py-3 text-right font-semibold">2</td>
            <td className="px-4 py-3 text-center">
                <label className="mb-2 block">Cash</label>
                <div className="flex flex-wrap gap-1 justify-center text-xs text-gray-700 mb-5 font-medium">
                    {item.costCashYearlies
                        .filter(({ type }) => type === 'cash')
                        .map(({type, year, amount }) => (
                            <span
                                key={`cash-${year}`}
                                className="bg-green-100 px-2 py-0.5 rounded"
                            >
                              {year} : ${Number(amount).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                        ))}
                </div>

                <label className="mb-2 block">Cost</label>
                <div className="flex flex-wrap gap-1 justify-center text-xs text-gray-700 font-medium">
                    {item.costCashYearlies
                        .filter(({ type }) => type === 'cost')
                        .map(({type, year, amount }) => (
                            <span
                                key={`cash-${year}`}
                                className="bg-blue-100 px-2 py-0.5 rounded"
                            >
                              {year} : ${Number(amount).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                        ))}
                </div>

            </td>
        </tr>
    )
}
