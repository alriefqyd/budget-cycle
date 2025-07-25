import {useEffect, useState} from "react";
import { Head, usePage } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout.jsx";
import CardWrapper from "@/Components/CardWrapper.jsx";
import ContainerWrapper from "@/Components/ContainerWrapper.jsx";
import RowTable from "@/Components/Budgets/RowTable.jsx";
import UploadModal from "@/Components/Budgets/UploadModal.jsx";
import { router } from "@inertiajs/react";
import {Spinner} from "@/Components/Spinner.jsx";
import Swal from "sweetalert2";
import axios from "axios";

export default function Dashboard() {
    const { projects } = usePage().props;
    const [projectState, setProjectState] = useState(projects);
    const [modalType, setModalType] = useState('excel')
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);  // <-- loading state
    const [shouldReload, setShouldReload] = useState(false);

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
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Dashboard
                </h2>
            }
        >
            <Head title="Budget" />

            <ContainerWrapper>
                <CardWrapper>
                    <div className="p-6 bg-white shadow-sm rounded-xl border border-gray-200">
                        <div className="mb-4 flex justify-between">
                            <h2 className="text-xl font-semibold text-gray-900">
                                Budget Overview
                            </h2>
                            <div className="flex justify-end gap-1">
                                <button
                                    onClick={() => {
                                        setShowModal(true);
                                        setModalType('excel');
                                    }}
                                    className="px-4 py-2 bg-teal-600 text-white text-sm rounded hover:bg-teal-700 justify-center"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <Spinner/>
                                            <span className="ml-2">Uploading...</span>
                                        </>
                                    ) : (
                                        "Upload Excel"
                                    )}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowModal(true);
                                        setModalType('form');
                                    }}
                                    className="px-4 py-2 bg-teal-600 text-white text-sm rounded hover:bg-teal-700 justify-center"
                                    disabled={loading}>
                                    Create New Budget Cycle
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm text-gray-900">
                                <thead className="bg-teal-500 text-xs text-white uppercase font-semibold">
                                <tr>
                                    <th className="px-4 py-3 text-center">Year</th>
                                    <th className="px-4 py-3 text-right">Cash Total</th>
                                    <th className="px-4 py-3 text-right">Cost Total</th>
                                    <th className="px-4 py-3 text-right">Status</th>
                                    <th className="px-4 py-3 text-right">Version</th>
                                    <th className="px-4 py-3 text-center">
                                        Yearly Breakdown
                                    </th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
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
                </CardWrapper>
            </ContainerWrapper>

            <UploadModal
                show={showModal}
                modalType={modalType}
                onClose={() => {
                    if (!loading) setShowModal(false);
                }}
                onSubmit={handleUpload}
                loading={loading}  // pass loading to modal
            />
        </AuthenticatedLayout>
    );
}
