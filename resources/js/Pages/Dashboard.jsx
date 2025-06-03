import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import StatCard from "@/Components/StatCard.jsx";
import CardWrapper from "@/Components/CardWrapper.jsx";
import ContainerWrapper from "@/Components/ContainerWrapper.jsx";

export default function Dashboard() {
    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Dashboard
                </h2>
            }
        >
            <Head title="Dashboard"/>
            <ContainerWrapper>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6">
                    <div className="md:col-span-12 bg-white rounded-xl p-6 shadow-lg">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold">Budget Chart</h3>
                                <p className="text-sm text-gray-500 flex items-center gap-1">
                                    <span className="text-green-500">▲</span> 86% More than last year
                                </p>
                            </div>
                        </div>
                        {/* Placeholder for Chart */}
                        <div
                            className="mt-4 h-48 bg-gradient-to-b from-emerald-200 to-white rounded-lg flex items-center justify-center text-gray-400">
                            Sales Chart Placeholder
                        </div>
                    </div>
                </div>
                {/* Income and Loss Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <StatCard label={"Our Annual Income"} value={"8,50,49"} percentage={"▲ 95.54%"}></StatCard>
                    <StatCard label={"Our Annual Income"} value={"8,11,49"} percentage={"▲ 95.54%"}></StatCard>
                </div>
            </ContainerWrapper>



        </AuthenticatedLayout>
    );
}
