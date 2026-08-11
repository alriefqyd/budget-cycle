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
import BarChartByGroup from "@/Components/BarChartByGroup.jsx";
import FloatingChart from "@/Components/FloatingChart.jsx";
import StackedTrendByDirectorate from "@/Components/StackedTrendByDirectorate.jsx";
import {Spinner} from "@/Components/Spinner.jsx"; // for module use

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartDataLabels);


export default function Dashboard() {
    const { dataChart, dataCostCash5yp, pieChart, floatingChart, directorateTrend, dataByType, dataByCategory, versions, defaultVersion, year, availablePeriods } = usePage().props
    const [dataChartDashboard, setDataChartDashboard] = useState(dataChart)
    const [dataChartCostCash, setDataChartCostCash] = useState(dataCostCash5yp)
    const [dataCategory, setDataCategory] = useState(pieChart)
    const [dataByDirectorate, setDataByDirectorate] = useState(floatingChart);
    const [dataDirectorateTrend, setDataDirectorateTrend] = useState(directorateTrend);
    const [dataByTypeOfInvestment, setDataByTypeOfInvestment] = useState(dataByType);
    const [dataByCategoryReal, setDataByCategoryReal] = useState(dataByCategory);
    const [currentYear, setCurrentYear] = useState(year);
    const [versionList, setVersionList] = useState(versions);
    const [version, setVersion] = useState(defaultVersion);
    const [defaultVersionState, setDefaultVersionState] = useState(defaultVersion);
    const [loading, setLoading] = useState(false);
    // this will update data chart if broadcast exist
    useEffect(() => {
        const channel = window.Echo.channel('dashboard')
            .listen('.dashboard.update', (event) => {
                // A broadcast fires whenever ANY period's data changes — if
                // it's for a period other than the one currently on screen,
                // applying it would silently swap what the user is looking at.
                if (event.year && String(event.year) !== String(currentYear)) return;

                setDataChartDashboard(event.data);
                setDataChartCostCash(event.dataCostCash);
                setDataCategory(event.dataCategory);
                setDataByDirectorate(event.dataOwner);
                setDataDirectorateTrend(event.dataDirectorateTrend);
                setDataByTypeOfInvestment(event.dataByType);
                setDataByCategoryReal(event.dataByCategory);
            });

        return () => {
            window.Echo.leave('dashboard');
        };
    }, [currentYear]);

    // Shared by both handlers below — deliberately does NOT touch `version`:
    // handleVersionChange already has the user's explicitly-picked version
    // set, and calling setVersion(data.defaultVersion) here would silently
    // snap the dropdown back to the default and discard that choice.
    // handlePeriodChange (switching to a different period) is the one case
    // that should reset to the new period's default version, so it sets
    // `version` itself right after calling this.
    const applyDashboardResponse = (data) => {
        setDataChartDashboard(data.dataChart)
        setDataChartCostCash(data.dataCostCash5yp)
        setDataCategory(data.pieChart)
        setDataByDirectorate(data.floatingChart)
        setDataDirectorateTrend(data.directorateTrend)
        setDataByTypeOfInvestment(data.dataByType)
        setDataByCategoryReal(data.dataByCategory)
        setVersionList(data.versions)
        setDefaultVersionState(data.defaultVersion)
    }

    const handleVersionChange = async (e) => {
        const selectedVersion = e.target.value;
        setVersion(selectedVersion);
        setLoading(true)

        const response = await axios({
            method: 'get',
            url: `/getDashboardByVersion/`,
            params: {
                year: currentYear,
                version: selectedVersion
            }, // axios will handle JSON automatically
            headers: {
                'Accept': 'application/json'
            }
        });

        applyDashboardResponse(response.data);
        setLoading(false)
    }

    const handlePeriodChange = async (e) => {
        const selectedYear = e.target.value;
        setCurrentYear(selectedYear);
        setLoading(true)

        const response = await axios({
            method: 'get',
            url: `/getDashboardByVersion/`,
            params: { year: selectedYear }, // version omitted -> backend defaults to that year's latest
            headers: { 'Accept': 'application/json' }
        });

        applyDashboardResponse(response.data);
        setVersion(response.data.defaultVersion);
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
                            <span className="text-primary font-bold">Budget Forecast {currentYear} - {parseInt(currentYear) + 4}</span>
                        </nav>
                        <h2 className="font-display-lg text-display-lg font-black text-on-surface flex items-center gap-3">
                            Budget Forecast {currentYear} - {parseInt(currentYear) + 4}
                            {String(version) === String(defaultVersionState) && (
                                <span className="bg-primary-container text-on-primary-container text-[12px] px-3 py-1 rounded-full font-bold">LIVE VERSION</span>
                            )}
                        </h2>
                    </div>
                    <div className="flex items-center gap-stack-sm">
                        <div className="flex items-center gap-2 px-3 py-2 bg-surface-container-high rounded-lg border border-outline-variant">
                            <span className="text-xs font-bold text-on-surface-variant">PERIOD:</span>
                            <select
                                value={currentYear}
                                onChange={handlePeriodChange}
                                disabled={loading}
                                className="bg-transparent border-none focus:ring-0 text-sm font-bold text-primary p-0 disabled:opacity-50"
                            >
                                {(availablePeriods ?? []).map((y) => (
                                    <option key={y} value={y}>
                                        {`${y} - ${parseInt(y) + 4}`}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 bg-surface-container-high rounded-lg border border-outline-variant">
                            <span className="text-xs font-bold text-on-surface-variant">VERSION:</span>
                            <select
                                value={version}
                                onChange={handleVersionChange}
                                disabled={loading}
                                className="bg-transparent border-none focus:ring-0 text-sm font-bold text-primary p-0 disabled:opacity-50"
                            >
                                {versionList.map((ver) => (
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
                <div className="relative">
                    {loading && (
                        <div className="absolute inset-0 z-10 bg-surface/70 backdrop-blur-[1px] rounded-xl">
                            {/* Sticky, not centered in the whole (very tall) grid — otherwise
                                the spinner sits below the fold until the user scrolls down. */}
                            <div className="sticky top-1/3 flex flex-col items-center gap-3">
                                <Spinner color="text-primary" size="h-8 w-8" />
                                <span className="text-sm font-bold text-on-surface-variant">Loading dashboard…</span>
                            </div>
                        </div>
                    )}
                    <div className={`grid grid-cols-12 gap-gutter transition-opacity ${loading ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                        <div className="col-span-12">
                            <BarChart chartName="chart5YP" dataChart={dataChartDashboard} year={currentYear} />
                        </div>

                        <div className="col-span-12 lg:col-span-6">
                            <BarChartCostCash dataChart={dataChartCostCash} year={currentYear} />
                        </div>
                        <div className="col-span-12 lg:col-span-6">
                            <PieChartCategory dataChart={dataCategory} year={currentYear} title="Project Status" noun="status" />
                        </div>

                        <div className="col-span-12 lg:col-span-6">
                            <BarChartByGroup dataChart={dataByTypeOfInvestment} year={currentYear} title="Budget by Type of Investment" noun="type of investment" />
                        </div>
                        <div className="col-span-12 lg:col-span-6">
                            <BarChartByGroup dataChart={dataByCategoryReal} year={currentYear} title="Budget by Category" noun="category" />
                        </div>

                        <div className="col-span-12">
                            <FloatingChart dataChart={dataByDirectorate} year={currentYear} />
                        </div>

                        <div className="col-span-12">
                            <StackedTrendByDirectorate dataChart={dataDirectorateTrend} year={currentYear} />
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
