import {useRef} from "react";
import {Spinner} from "@/Components/Spinner.jsx";

export default function UploadModal({ show, onClose, onSubmit, loading }) {
    const fileInput = useRef();
    const yearSelect = useRef();

    if (!show) return null;

    const years = Array.from({ length: 11 }, (_, i) => 2020 + i);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg">
                <h2 className="text-lg font-semibold mb-4 text-gray-800">Upload Excel File</h2>

                <form
                    encType="multipart/form-data"
                    onSubmit={(e) => {
                        e.preventDefault();
                        onSubmit({
                            file: fileInput.current.files[0],
                            year: yearSelect.current.value
                        });
                    }}
                >
                    <label className="block mb-2 text-sm font-medium text-gray-700">Select Year</label>
                    <select
                        name="year"
                        ref={yearSelect}
                        required
                        className="block w-full mb-4 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                        <option value="">-- Choose Year --</option>
                        {years.map((year) => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>

                    <label className="block mb-2 text-sm font-medium text-gray-700">Excel File</label>
                    <input
                        type="file"
                        accept=".xlsx, .xls"
                        name="file"
                        ref={fileInput}
                        required
                        className="block w-full mb-4 text-sm text-gray-900 border border-gray-300 rounded-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500 file:bg-teal-600 file:text-white file:px-4 file:py-2 file:rounded file:border-none file:cursor-pointer"
                    />

                    <div className="flex justify-end space-x-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-teal-600 text-white text-sm rounded hover:bg-teal-700 flex items-center justify-center"
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
                    </div>
                </form>
            </div>
        </div>
    );
}
