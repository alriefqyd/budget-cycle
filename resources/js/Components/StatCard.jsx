export default function StatCard({ value, label, percentage, percentageColor }) {
    return (
        <div className="bg-white p-6 rounded-xl shadow text-center">
            <div className="text-3xl mb-2">{value}</div>
            <p className="text-gray-500">{label}</p>
            <p className={`${percentageColor} text-sm mt-2`}>{percentage}</p>
        </div>
    );
}
