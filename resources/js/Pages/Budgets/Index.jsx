import {useEffect, useState} from "react";
import { Head, usePage } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout.jsx";
import RowTable from "@/Components/Budgets/RowTable.jsx";
import UploadModal from "@/Components/Budgets/UploadModal.jsx";
import {Spinner} from "@/Components/Spinner.jsx";
import Swal from "sweetalert2";
import axios from "axios";

export default function Budgets() {
    const { projects } = usePage().props;
    const [projectState, setProjectState] = useState(projects);
    const [modalType, setModalType] = useState('excel')
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [shouldReload, setShouldReload] = useState(false);
    let existingStartYear = projects.map(function (item) {
        return item.start_year
    })

    useEffect(() => {
        const channel = window.Echo.channel('budgetList')
            .listen('.budgetList.update', (event) => {
                const newData = event.data;
                setProjectState(newData);
            })
    },[])
    const handleUpload = async (data) => {
        setLoading(true);  // start loading
        const formData = new FormData();
        formData.append("file", data.file);
        formData.append("year", data.year);

        try {
            setLoading(true);

            const response = await axios.post(data.file ? '/budgets/upload' : '/budgets/create', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            Swal.fire({
                icon: 'success',
                title: 'Upload Successful',
                text: response.data.message,
                timer: 2000,
                showConfirmButton: false,
            });
        } catch (error) {
            console.error(error);

            Swal.fire({
                icon: 'error',
                title: 'Upload Failed',
                text: error.response?.data?.message || 'Something went wrong',
            });
        } finally {
            setShowModal(false);
            setLoading(false);
            setShouldReload(true);
        }
    };

    const totalCash = projectState.reduce((sum, p) => sum + (Number(p.total_cash) || 0), 0);
    const totalCost = projectState.reduce((sum, p) => sum + (Number(p.total_cost) || 0), 0);
    const costRatio = totalCash > 0 ? Math.min(100, Math.round((totalCost / totalCash) * 100)) : 0;
    const latestCycle = [...projectState].sort((a, b) => b.start_year - a.start_year)[0];
    const currency = (value) =>
        `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <AuthenticatedLayout>
            <Head title="Budget Overview" />

            <div className="space-y-stack-md">
                {/* Page Header & Actions */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
                    <div>
                        <nav className="flex text-outline mb-2">
                            <span className="text-[11px] font-label-caps uppercase">Finance</span>
                            <span className="mx-2 text-[11px]">/</span>
                            <span className="text-[11px] font-label-caps text-primary uppercase">Budgets</span>
                        </nav>
                        <h2 className="font-headline-md text-headline-md text-on-surface">Budget Overview</h2>
                    </div>
                    <div className="flex gap-stack-sm">
                        <button
                            onClick={() => {
                                setShowModal(true);
                                setModalType('excel');
                            }}
                            disabled={loading}
                            className="flex items-center gap-2 px-5 py-2.5 bg-surface-container-lowest border border-primary text-primary font-bold rounded-lg hover:bg-primary/5 transition-colors disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <Spinner color="text-primary" />
                                    <span className="font-label-caps text-label-caps">Uploading...</span>
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-[20px]">upload_file</span>
                                    <span className="font-label-caps text-label-caps">Upload Excel</span>
                                </>
                            )}
                        </button>
                        <button
                            onClick={() => {
                                setShowModal(true);
                                setModalType('form');
                            }}
                            disabled={loading}
                            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary font-bold rounded-lg shadow-md hover:brightness-110 transition-all disabled:opacity-50"
                        >
                            <span className="material-symbols-outlined text-[20px]">add_circle</span>
                            <span className="font-label-caps text-label-caps">Create New Budget Cycle</span>
                        </button>
                    </div>
                </div>

                {/* Bento Grid Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-stack-md">
                    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm group hover:border-primary/40 transition-colors">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-tertiary-container/10 rounded-lg">
                                <span className="material-symbols-outlined text-tertiary-container">payments</span>
                            </div>
                            <span className="font-label-caps text-label-caps text-tertiary-container bg-tertiary-container/10 px-2 py-1 rounded">
                                {projectState.length} cycle{projectState.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                        <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">CASH TOTAL</p>
                        <h3 className="font-display-lg text-display-lg text-on-surface font-black">{currency(totalCash)}</h3>
                        <p className="text-[11px] text-outline mt-2 italic">Sum across all budget cycles</p>
                    </div>

                    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm group hover:border-primary/40 transition-colors">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-primary-container/10 rounded-lg">
                                <span className="material-symbols-outlined text-primary-container">account_balance</span>
                            </div>
                            <span className="font-label-caps text-label-caps text-primary bg-primary-container/10 px-2 py-1 rounded">
                                {costRatio}% OF CASH
                            </span>
                        </div>
                        <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">COST TOTAL</p>
                        <h3 className="font-display-lg text-display-lg text-on-surface font-black">{currency(totalCost)}</h3>
                        <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-4 overflow-hidden">
                            <div className="bg-primary h-full" style={{ width: `${costRatio}%` }}></div>
                        </div>
                    </div>

                    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm group hover:border-primary/40 transition-colors">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-secondary-container/10 rounded-lg">
                                <span className="material-symbols-outlined text-secondary">assignment_turned_in</span>
                            </div>
                        </div>
                        <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">LATEST CYCLE STATUS</p>
                        <div className="flex items-center gap-3">
                            <span className="px-4 py-2 bg-secondary-container text-on-secondary-fixed font-bold rounded-lg text-title-sm tracking-tight">
                                {latestCycle ? latestCycle.status : 'N/A'}
                            </span>
                        </div>
                        <p className="font-body-sm text-body-sm text-outline mt-4">
                            {latestCycle ? `Cycle ${latestCycle.start_year} - ${latestCycle.end_year}` : 'No cycles yet'}
                        </p>
                    </div>
                </div>

                {/* Detailed Breakdown Card */}
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
                    <div className="bg-primary px-container-padding py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-white">grid_view</span>
                            <h4 className="font-title-sm text-title-sm text-white font-bold">Budget Cycles</h4>
                        </div>
                        <div className="flex items-center gap-2 text-white/80">
                            <span className="material-symbols-outlined text-[18px]">info</span>
                            <span className="text-[11px] font-label-caps">Click a row to open the 5-year breakdown</span>
                        </div>
                    </div>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-surface-container-low border-b border-outline-variant">
                                    <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant uppercase border-r border-outline-variant/30 text-center">Period</th>
                                    <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant uppercase text-right">Cash Total</th>
                                    <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant uppercase text-right">Cost Total</th>
                                    <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant uppercase text-right">Status</th>
                                    <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant uppercase text-center">Yearly Breakdown</th>
                                </tr>
                            </thead>
                            <tbody className="font-data-tabular text-data-tabular divide-y divide-outline-variant/30">
                                {projectState.map((project, index) => (
                                    <RowTable
                                        key={index}
                                        budget={`${project.start_year}`}
                                        item={project}
                                        url={`/budgets/${project.start_year}`}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <UploadModal
                show={showModal}
                modalType={modalType}
                onClose={() => {
                    if (!loading) setShowModal(false);
                }}
                existingStartYear={existingStartYear}
                onSubmit={handleUpload}
                loading={loading}  // pass loading to modal
            />
        </AuthenticatedLayout>
    );
}
