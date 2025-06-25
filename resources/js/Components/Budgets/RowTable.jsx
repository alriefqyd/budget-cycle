import {usePage} from "@inertiajs/react";

export default function RowTable(props) {

    const {budget, item} = props
    const totalCash = item.reduce((acc, item) => acc + parseInt(item.budgets?.total_cash ?? 0), 0);
    const totalCost = item.reduce((acc, item) => acc + parseInt(item.budgets?.total_cost ?? 0), 0);

    return (
        <tr key={props.budget.id} onClick={() => window.location.href = props.url} className="odd:bg-white cursor-pointer even:bg-gray-50 hover:bg-yellow-50 transition duration-150">
            <td className="px-4 py-3 text-center font-medium">{budget} - {parseInt(budget) + 4}</td>
            <td className="px-4 py-3 text-right font-semibold">$ {totalCash.toLocaleString()}</td>
            <td className="px-4 py-3 text-right font-semibold">$ {totalCost.toLocaleString()}</td>
            <td className="px-4 py-3 text-center">
                <div
                    className="flex flex-wrap gap-1 justify-center text-xs text-gray-700 font-medium">
                    <span className="bg-blue-100 px-2 py-0.5 rounded">2025: $100K</span>
                    <span className="bg-blue-100 px-2 py-0.5 rounded">2026: $100K</span>
                    <span className="bg-blue-100 px-2 py-0.5 rounded">2027: $100K</span>
                    <span className="bg-blue-100 px-2 py-0.5 rounded">2028: $100K</span>
                    <span className="bg-blue-100 px-2 py-0.5 rounded">2029: $100K</span>
                </div>
            </td>
        </tr>
    )
}
