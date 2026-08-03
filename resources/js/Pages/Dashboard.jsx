import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {Head, usePage} from '@inertiajs/react';
import { AgCharts } from 'ag-charts-react';
import {useEffect, useState} from "react";
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import BarChart from "@/Components/BarChart.jsx";
import BarChartCostCash from "@/Components/BarChartCostCash.jsx";
import PieChartCategory from "@/Components/PieChartCategory.jsx";
import FloatingChart from "@/Components/FloatingChart.jsx";
import StackedTrendByDirectorate from "@/Components/StackedTrendByDirectorate.jsx";
import {Spinner} from "@/Components/Spinner.jsx"; // for module use

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartDataLabels);


export default function Dashboard() {
    const { dataChart, dataCostCash5yp, pieChart, floatingChart, directorateTrend, versions, defaultVersion, year } = usePage().props
    const [dataChartDashboard, setDataChartDashboard] = useState(dataChart)
    const [dataChartCostCash, setDataChartCostCash] = useState(dataCostCash5yp)
    const [dataCategory, setDataCategory] = useState(pieChart)
    const [dataByDirectorate, setDataByDirectorate] = useState(floatingChart);
    const [dataDirectorateTrend, setDataDirectorateTrend] = useState(directorateTrend);
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
                const newDataDirectorateTrend = event.dataDirectorateTrend;

                setDataChartDashboard(newData);
                setDataChartCostCash(newDataCostCash);
                setDataCategory(newDataCategory);
                setDataByDirectorate(newDataByDirectorate);
                setDataDirectorateTrend(newDataDirectorateTrend);
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
                year: year,
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
        setDataDirectorateTrend(response.data.directorateTrend)
        setLoading(false)
    }

    return (
        <AuthenticatedLayout>
            <Head title="Dashboard"/>

            <div className="space-y-stack-md">
                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-stack-md gap-stack-md">
                    <div>
                        <nav className="flex items-center text-on-surface-variant text-xs mb-2 gap-1">
                            <span>Planning</span>
                            <span className="material-symbols-outlined text-sm">chevron_right</span>
                            <span className="text-primary font-bold">Budget Forecast {year} - {parseInt(year) + 4}</span>
                        </nav>
                        <h2 className="font-display-lg text-display-lg font-black text-on-surface flex items-center gap-3">
                            Budget Forecast {year} - {parseInt(year) + 4}
                            {String(version) === String(defaultVersion) && (
                                <span className="bg-primary-container text-on-primary-container text-[12px] px-3 py-1 rounded-full font-bold">LIVE VERSION</span>
                            )}
                        </h2>
                    </div>
                    <div className="flex items-center gap-stack-sm">
                        <div className="flex items-center gap-2 px-3 py-2 bg-surface-container-high rounded-lg border border-outline-variant">
                            <span className="text-xs font-bold text-on-surface-variant">VERSION:</span>
                            <select
                                value={version}
                                onChange={handleVersionChange}
                                className="bg-transparent border-none focus:ring-0 text-sm font-bold text-primary p-0"
                            >
                                {versions.map((ver) => (
                                    <option key={ver.version} value={ver.version}>
                                        {`v${ver.version}`}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {loading && <Spinner color="text-primary" />}
                    </div>
                </div>

                {/* Bento Grid Content */}
                <div className="grid grid-cols-12 gap-gutter">
                    <div className="col-span-12">
                        <BarChart chartName="chart5YP" dataChart={dataChartDashboard} year={year} />
                    </div>

                    <div className="col-span-12 lg:col-span-6">
                        <BarChartCostCash dataChart={dataChartCostCash} year={year} />
                    </div>
                    <div className="col-span-12 lg:col-span-6">
                        <PieChartCategory dataChart={dataCategory} year={year} />
                    </div>

                    <div className="col-span-12">
                        <FloatingChart dataChart={dataByDirectorate} year={year} />
                    </div>

                    <div className="col-span-12">
                        <StackedTrendByDirectorate dataChart={dataDirectorateTrend} year={year} />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
