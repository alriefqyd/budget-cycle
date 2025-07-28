import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {Head, usePage} from '@inertiajs/react';
import StatCard from "@/Components/StatCard.jsx";
import CardWrapper from "@/Components/CardWrapper.jsx";
import ContainerWrapper from "@/Components/ContainerWrapper.jsx";
import { AgCharts } from 'ag-charts-react';
import {useEffect, useState} from "react";
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels'; // for module use

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartDataLabels);


export default function Dashboard() {
    const { dataChart } = usePage().props
    const [dataChartDashboard, setDataChartDashboard] = useState(dataChart)
    const roundUp = (value, multiple) => Math.ceil(value / multiple) * multiple;
    const maxPlanAxisLeft = roundUp(Math.max(...dataChartDashboard.approved, ...dataChartDashboard.plan) + 20, 1);
    const maxPlanAxisRight = roundUp(Math.max(...dataChartDashboard.approved5yp, ...dataChartDashboard.plan5yp) + 20, 1);

    const data = {
        labels: dataChartDashboard.label,
        datasets: [
            // Plan (2026–2030) - Left Axis
            {
                label: 'Plan',
                data: dataChartDashboard.plan,
                borderColor: 'green',
                backgroundColor: '#009199',
                yAxisID: 'approvedAxis',
                barThickness: 52,
            },
            // Approved (2026–2030) - Left Axis
            {
                label: 'Approved',
                data: dataChartDashboard.approved,
                borderColor: 'blue',
                backgroundColor: '#e9b733',
                yAxisID: 'approvedAxis',
                barThickness: 50,
            },
            // Plan (5YP) - Right Axis
            {
                label: 'Plan (5YP)',
                skipLegend: true,
                data: dataChartDashboard.plan5yp,
                borderColor: 'lightgreen',
                backgroundColor: '#009199',
                yAxisID: 'planAxis',
                barThickness: 50,

            },
            // Approved (5YP) - Right Axis
            {
                label: 'Approved (5YP)',
                skipLegend: true,
                data: dataChartDashboard.approved5yp,
                borderColor: 'lightblue',
                backgroundColor: '#e9b733',
                yAxisID: 'planAxis',
                barThickness: 52,
            },
        ]
    };


    const options = {
        responsive: true,
        plugins: {
            title: {
                display: true,
                text: '5YP 2026–2030 Sustaining Investment Highlights (Cash in million)',
                font: {
                    size: 16,
                },
            },
            tooltip: {
                mode: 'index',
                intersect: false,
            },
            legend: {
                position: 'top',
                labels: {
                    generateLabels: function (chart) {
                        return chart.data.datasets
                            .filter(ds => !ds.skipLegend) // ⬅️ filter out datasets with skipLegend
                            .map((dataset, i) => {
                                return {
                                    text: dataset.label,
                                    fillStyle: dataset.backgroundColor,
                                    hidden: !chart.isDatasetVisible(i),
                                    datasetIndex: i
                                }
                            });
                    }
                }
            },
            datalabels: {
                anchor: 'end',
                align: 'start',
                offset: -20,
                color: 'black',
                font: {
                    weight: 'bold',
                    size: 12,

                },
                formatter: function (value) {
                    return value?.toLocaleString(); // Adds commas
                },
            },
        },
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false,
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Year',
                },
                categoryPercentage: 0.8,
                barPercentage: 0.9
            },
            approvedAxis: {
                type: 'linear',
                position: 'left',
                beginAtZero: true,
                max: maxPlanAxisLeft,
                title: {
                    display: true,
                    text: 'Investment',
                },

            },
            planAxis: {
                type: 'linear',
                position: 'right',
                beginAtZero: true,
                max: maxPlanAxisRight,
                title: {
                    display: true,
                    text: '5YP Total',
                },
                grid: {
                    drawOnChartArea: false,
                },
            },
        },

    };

    // this will update data chart if broadcast exist
    useEffect(() => {
        const channel = window.Echo.channel('dashboard')
            .listen('.dashboard.update', (event) => {
                const newData = event.data;
                setDataChartDashboard(newData);
            });

        return () => {
            window.Echo.leave('dashboard');
        };
    }, []);

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
                        <Bar options={options} data={data}/>
                    </div>
                </div>
                {/* Income and Loss Cards */}
                {/*<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <StatCard label={"Our Annual Income"} value={"8,50,49"} percentage={"▲ 95.54%"}></StatCard>
                    <StatCard label={"Our Annual Income"} value={"8,11,49"} percentage={"▲ 95.54%"}></StatCard>
                </div>*/}
            </ContainerWrapper>
        </AuthenticatedLayout>
    );
}
