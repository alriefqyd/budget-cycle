import {useRef} from "react";
import {Spinner} from "@/Components/Spinner.jsx";

export default function UploadModalDetail({ show, onClose, onSubmit, loading }) {
    const url = window.location.href;
    const year = url.split('/').pop();
    const fileInput = useRef();

    if (!show) return null;

    const years = Array.from({ length: 11 }, (_, i) => 2020 + i);

    return (
        <div className="fixed inset-0 bg-inverse-surface/50 flex items-center justify-center z-50">
            <div className="bg-surface-container-lowest rounded-xl p-6 w-full max-w-md shadow-lg border border-outline-variant">
                <h2 className="font-title-sm text-title-sm mb-4 text-on-surface">Import data project</h2>

                <form
                    encType="multipart/form-data"
                    onSubmit={(e) => {
                        e.preventDefault();

                        let paramsSubmit = {
                            year: year || ''
                        };

                        const file = fileInput.current?.files?.[0] || null;
                        paramsSubmit = {
                            file,
                            year: year || ''
                        };

                        onSubmit(paramsSubmit);
                    }}
                >
                    <label className="block mb-2 font-body-sm text-body-sm text-on-surface-variant">Excel File</label>
                    <input
                        type="file"
                        accept=".xlsx, .xls"
                        name="file"
                        required
                        ref={fileInput}
                        className="block w-full mb-4 text-sm text-on-surface border border-outline-variant rounded-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40 file:bg-primary file:text-on-primary file:px-4 file:py-2 file:rounded file:border-none file:cursor-pointer"
                    />
                    <div className="flex justify-end space-x-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-surface-container-high text-on-surface-variant rounded-lg hover:bg-surface-container-highest text-sm font-label-caps"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-primary text-on-primary text-sm font-label-caps rounded-lg hover:brightness-110 flex items-center justify-center"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Spinner/>
                                    <span className="ml-2">Uploading...</span>
                                </>
                            ) : 'Import New Project' }
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
