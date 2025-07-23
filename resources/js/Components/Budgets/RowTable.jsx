import {usePage} from "@inertiajs/react";
import {useEffect} from "react";

export default function RowTable(props) {

    const {budget, item} = props
    const totalCash = item.reduce((acc, item) => acc + parseInt(item.budgets?.total_cash ?? 0), 0);
    const totalCost = item.reduce((acc, item) => acc + parseInt(item.budgets?.total_cost ?? 0), 0);

    let collectBudgetYear = [];

    useEffect(() => {
        const channel = window.Echo.channel('dashboard')
            .listen('.budget_list.update', (event) => {
                const newData = event.data;
                console.log(newData);
            })
    })

    item.map((item) => {
        item.cash_cost_yearlies.map((item) => {
            collectBudgetYear.push({
                year: item.year,
                amount: parseFloat(item.amount ?? 0),
                type: item.type,
            });
        });
    })

    let result = {};

    collectBudgetYear.forEach(({ year, amount, type }) => {
        if (!result[year]) {
            result[year] = { year, cost: 0, cash: 0 };
        }
        result[year][type] += amount;
    });

    return (
        <tr key={props.budget.id} onClick={() => window.location.href = props.url} className="odd:bg-white cursor-pointer even:bg-gray-50 hover:bg-yellow-50 transition duration-150">
            <td className="px-4 py-3 text-center font-medium">{budget} - {parseInt(budget) + 4}</td>
            <td className="px-4 py-3 text-right font-semibold">$ {totalCash.toLocaleString()}</td>
            <td className="px-4 py-3 text-right font-semibold">$ {totalCost.toLocaleString()}</td>
            <td className="px-4 py-3 text-right font-semibold">Approved / On Going</td>
            <td className="px-4 py-3 text-right font-semibold">2</td>
            <td className="px-4 py-3 text-center">
                <label className="mb-2 block">Cash</label>
                <div className="flex flex-wrap gap-1 justify-center text-xs text-gray-700 mb-5 font-medium">
                    {Object.values(result).map(({ year, cash }) => (
                        <span key={`cash-${year}`} className="bg-blue-100 px-2 py-0.5 rounded">
                          {year}: ${Number(cash).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                    ))}
                </div>

                <label className="mb-2 block">Cost</label>
                <div className="flex flex-wrap gap-1 justify-center text-xs text-gray-700 font-medium">
                    {Object.values(result).map(({year, cost}) => (
                        <span key={`cost-${year}`} className="bg-blue-100 px-2 py-0.5 rounded">
                          {year}: ${Number(cost).toLocaleString(undefined, {maximumFractionDigits: 0})}
                        </span>
                    ))}
                </div>

            </td>
        </tr>
    )
}
