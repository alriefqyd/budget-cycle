import {usePage} from "@inertiajs/react";

export default function RowTable(props) {

    const {budget} = props
    return (
        <tr key={props.budget.id} onClick={() => window.location.href = props.url} className="odd:bg-white cursor-pointer even:bg-gray-50 hover:bg-yellow-50 transition duration-150">
            <td className="px-4 py-3 text-center font-medium">{budget}</td>
            <td className="px-4 py-3 text-right font-semibold">$1,200,000</td>
            <td className="px-4 py-3 text-center">
                <div
                    className="flex flex-wrap gap-1 justify-center text-xs text-gray-700 font-medium">
                    <span className="bg-blue-100 px-2 py-0.5 rounded">Jan: $100K</span>
                    <span className="bg-blue-100 px-2 py-0.5 rounded">Feb: $100K</span>
                    <span className="bg-blue-100 px-2 py-0.5 rounded">Mar: $100K</span>

                    <span className="bg-blue-100 px-2 py-0.5 rounded">Dec: $100K</span>
                </div>
            </td>
        </tr>
    )
}
