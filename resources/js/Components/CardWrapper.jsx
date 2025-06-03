export default function CardWrapper({children}) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6">
            <div className="md:col-span-12 bg-white rounded-xl shadow-lg">
                {children}
            </div>
        </div>
    )
}
