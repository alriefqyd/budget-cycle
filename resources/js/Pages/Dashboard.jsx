import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {Head, usePage} from '@inertiajs/react';
import StatCard from "@/Components/StatCard.jsx";
import CardWrapper from "@/Components/CardWrapper.jsx";
import ContainerWrapper from "@/Components/ContainerWrapper.jsx";
import { AgCharts } from 'ag-charts-react';
import {useEffect, useState} from "react";
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import BarChart from "@/Components/BarChart.jsx";
import BarChartCostCash from "@/Components/BarChartCostCash.jsx";
import PieChartCategory from "@/Components/PieChartCategory.jsx";
import FloatingChart from "@/Components/FloatingChart.jsx";
import {Spinner} from "@/Components/Spinner.jsx"; // for module use

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartDataLabels);


export default function Dashboard() {
    const { dataChart, dataCostCash5yp, pieChart, floatingChart, versions, defaultVersion } = usePage().props
    const [dataChartDashboard, setDataChartDashboard] = useState(dataChart)
    const [dataChartCostCash, setDataChartCostCash] = useState(dataCostCash5yp)
    const [dataCategory, setDataCategory] = useState(pieChart)
    const [dataByDirectorate, setDataByDirectorate] = useState(floatingChart);
    const [version, setVersion] = useState(defaultVersion);
    const [loading, setLoading] = useState(false);
    // this will update data chart if broadcast exist
    useEffect(() => {
        const channel = window.Echo.channel('dashboard')
            .listen('.dashboard.update', (event) => {
                const newData = event.data;
                const newDataCostCash = event.dataCostCash;
                const newDataCategory = event.dataCategory;
                const newDataByDirectorate = event.dataOwner;

                setDataChartDashboard(newData);
                setDataChartCostCash(newDataCostCash);
                setDataCategory(newDataCategory);
                setDataByDirectorate(newDataByDirectorate);
                console.log(newDataByDirectorate)
            });

        return () => {
            window.Echo.leave('dashboard');
        };
    }, []);

    const handleVersionChange = async (e) => {
        const selectedVersion = e.target.value;
        setVersion(selectedVersion);
        setLoading(true)

        const response = await axios({
            method: 'get',
            url: `/getDashboardByVersion/`,
            params: {
                year: 2026,
                version: selectedVersion
            }, // axios will handle JSON automatically
            headers: {
                'Accept': 'application/json'
            }
        });

        setDataChartDashboard(response.data.dataChart)
        setDataChartCostCash(response.data.dataCostCash5yp)
        setDataCategory(response.data.pieChart)
        setDataByDirectorate(response.data.floatingChart)
        setLoading(false)
    }

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Dashboard
                </h2>
            }
        >
            <Head title="Dashboard"/>
            <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-600">Version:</label>
                <select
                    value={version}
                    onChange={handleVersionChange}
                    className="border border-gray-300 rounded-lg px-7 py-2 text-sm focus:ring focus:ring-yellow-400"
                >
                    {
                        versions.map((ver) => (
                            <option key={ver.version} value={ver.version}>
                                {`v${ver.version}`}
                            </option>
                        ))
                    }
                </select>
                {
                    loading && <Spinner color="text-green-800"></Spinner>
                }
            </div>
            <ContainerWrapper>
                <BarChart chartName="chart5YP" dataChart={dataChartDashboard} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <BarChartCostCash cols={6} dataChart={dataChartCostCash} />
                    <PieChartCategory cols={6} dataChart={dataCategory} />
                </div>
                <div className="grid grid-cols-1">
                    <FloatingChart dataChart={dataByDirectorate}/>
                </div>
            </ContainerWrapper>
        </AuthenticatedLayout>
    );
}
