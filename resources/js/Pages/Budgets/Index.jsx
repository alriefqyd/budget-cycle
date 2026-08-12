import {useEffect, useState} from "react";
import { Head, usePage } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout.jsx";
import RowTable from "@/Components/Budgets/RowTable.jsx";
import UploadModal from "@/Components/Budgets/UploadModal.jsx";
import {Spinner} from "@/Components/Spinner.jsx";
import Swal from "sweetalert2";
import axios from "axios";

export default function Budgets() {
    const { projects, auth } = usePage().props;
    const isViewer = auth.user.role === 'viewer';
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
                    {!isViewer && (
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
                    )}
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
