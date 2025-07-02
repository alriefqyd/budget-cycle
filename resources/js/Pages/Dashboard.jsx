import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {Head, usePage} from '@inertiajs/react';
import StatCard from "@/Components/StatCard.jsx";
import CardWrapper from "@/Components/CardWrapper.jsx";
import ContainerWrapper from "@/Components/ContainerWrapper.jsx";
import { AgCharts } from 'ag-charts-react';
import { useState } from "react";

export default function Dashboard() {
    const { dataChart } = usePage().props
    console.log(dataChart)
    const [chartOptions, setChartOptions] = useState({
        data : dataChart,
        padding: {
            top: 50, // increase this for label space above bars
        },
        title: {
            text: '5YP 2025–2029 Sustaining Investment Highlights',
            fontSize: 16,
        },
        series: [
            {
                type: 'bar',
                xKey: 'year',
                yKey: 'approved',
                yName: 'Approved 2024–2028',
                fill: '#F4B740',
                grouped: true,
                label: {
                    enabled: true,
                    placement: 'outside',
                    fontWeight: 'bold',
                    fontSize: 12,
                    color: '#fff',
                    formatter: ({ value }) => `${value ?? ''}`,
                },
            },
            {
                type: 'bar',
                xKey: 'year',
                yKey: 'plan',
                yName: 'Plan 2025–2029',
                fill: '#007B82',
                grouped: true,
                label: {
                    enabled: true,
                    placement: 'outside',
                    fontWeight: 'bold',
                    fontSize: 12,
                    color: '#ffff',
                    formatter: ({ value }) => `${value ?? ''}`,
                },
            },
        ],
        axes: [
            { type: 'category', position: 'bottom', title: { text: 'Year' } },
            { type: 'number', position: 'left', title: { text: 'Investment (x000 USD)' } },
        ],
        legend: { position: 'bottom' },
    });


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
                                    <span className="text-green-500">▲</span> Investment Comparison
                                </p>
                            </div>
                        </div>
                        <AgCharts options={chartOptions} className="p-3" style={{height: "calc(100vh - 150px)", width: "100%"}}/>
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
