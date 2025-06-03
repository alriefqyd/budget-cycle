import {useEffect, useState, useRef} from "react"
import { usePage } from "@inertiajs/react"
import { AgGridReact } from "ag-grid-react"
import "../../../css/ag-grid-custom.css";
import 'ag-grid-community/styles/ag-theme-alpine.css';

import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout.jsx"
import ContainerWrapper from "@/Components/ContainerWrapper.jsx"
import CardWrapper from "@/Components/CardWrapper.jsx"

import {
    ModuleRegistry,
    ClientSideRowModelModule,
    TextFilterModule,
    NumberFilterModule,
    PaginationModule,
    NumberEditorModule,
    TextEditorModule,
    SelectEditorModule,
    ClientSideRowModelApiModule,
    RenderApiModule
} from 'ag-grid-community';

ModuleRegistry.registerModules([
    ClientSideRowModelModule,
    TextFilterModule,
    NumberFilterModule,
    PaginationModule,
    NumberEditorModule,
    TextEditorModule,
    SelectEditorModule,
    ClientSideRowModelApiModule,
    RenderApiModule
]);

export default function Show() {
    const gridRef = useRef();
    const { projects, year, budgets } = usePage().props
    const columnDefs = [
        { headerName: "ID", field: "id", filter: 'agTextColumnFilter', pinned:'left', width: 40, hide:true},
        { headerName: "SAP Code", field: "sap_code", filter: 'agTextColumnFilter', pinned:'left', width: 40},
        { headerName: "Project's Title", field: "project_title",pinned:'left', width: 300},
        { headerName: "Note", field: "note", filter: 'agTextColumnFilter' },
        { headerName: "Status", field: "status_progress", filter: 'agTextColumnFilter', cellEditor: 'agSelectCellEditor',cellEditorParams: {
                values: ['ongoing', 'new'],
            } },
        { headerName: "PM", field: "project_manager", filter: 'agTextColumnFilter' },
        { headerName: "PC", field: "project_control", filter: 'agTextColumnFilter' },
        { headerName: "Director", field: "directorate", filter: 'agTextColumnFilter' },
        { headerName: "Owner Area", field: "owner_area", filter: 'agTextColumnFilter' },
        { headerName: "Type of Investment", field: "type_of_investment", filter: 'agTextColumnFilter', cellEditor: 'agSelectCellEditor',cellEditorParams: {
            values: ['English', 'Spanish', 'French', 'Portuguese'],
            } },
        { headerName: "Category", field: "category", filter: 'agTextColumnFilter', agTextColumnFilter: 'agTextColumnFilter', cellEditor: 'agSelectCellEditor',cellEditorParams: {
            values: ['English', 'Spanish', 'French', 'Portuguese'],
            } },
        { headerName: "Risk", field: "risk", filter: 'agTextColumnFilter' },
        { headerName: "Budget Car", field: "budget_car", filter: 'agTextColumnFilter' },
        { headerName: "Actual to Date", field: "actual_to_date", filter: 'agTextColumnFilter' },
        { headerName: "Budget 5YP", field: "budget_5yp", filter: 'agNumberColumnFilter'}, // Use number filter if this is numeric]
        { headerName: "Start Year", field: "start_year", filter: 'agTextColumnFilter' },
        { headerName: "Num Of Year Budget", field: "num_of_year_budget", filter: 'agTextColumnFilter', cellEditor: "agSelectCellEditor", cellEditorParams: {
                values: ['1', '2', '3', '4','5'],
        }},
        { headerName: "FM New", field: "fm_new", filter: 'agTextColumnFilter' },
    ]

    const pathParts = window.location.pathname.split('/');
    const startYear = parseInt(pathParts[pathParts.length - 1]) || new Date().getFullYear();
    const endYear = startYear + 4;

    for (let year = startYear; year <= endYear; year++) {
        columnDefs.push({
            headerName: `Cash - ${year}`,
            field: `cash_${year}`,
            filter: 'agNumberColumnFilter',
        });
    }

    columnDefs.push({
        headerName: "Cash Total",
        field: `total_cash`,
        filter: 'agTextColumnFilter',
    })

    for (let year = startYear; year <= endYear; year++) {
        columnDefs.push({
            headerName: `Cost - ${year}`,
            field: `cost_${year}`,
            filter: 'agNumberColumnFilter',
        });
    }

    columnDefs.push({
        headerName: "Cost Total",
        field: `total_cost`,
        filter: 'agTextColumnFilter',
    })



    const [rowData, setRowData] = useState([]);
    useEffect(() => {
        setRowData(budgets);
    }, [budgets]);

    const defaultColDef = {
        resizable: true,
        sortable: true,
        filter: true,
        flex: 1,
        minWidth: 120,
        editable: true,
    }


    const onCellValueChanged = async (params) => {
        const { data, colDef, api, node } = params;

        const budgetDistribute = (budgets, years) => {
            const budgetPerYear = budgets / years;
            const newStartYear = parseInt(data['start_year']);
            const newEndYear = newStartYear + parseInt(years) - 1;

            for (let year = startYear; year <= endYear; year++) {
                const field = `cash_${year}`;
                if (year >= newStartYear && year <= newEndYear) {
                    data[field] = budgetPerYear;
                } else {
                    data[field] = 0;
                }
            }

            data['total_cash'] = budgets;

            api.refreshCells({
                rowNodes: [node],
                force: true
            });
        };

        const updateTotal = (prefix, totalField) => {
            let total = 0;
            for (let year = startYear; year <= endYear; year++) {
                const field = `${prefix}_${year}`;
                const value = parseFloat(data[field]) || 0;
                total += value;
            }
            data[totalField] = total;

            api.refreshCells({
                rowNodes: [node],
                columns: [totalField],
                force: true
            });
        };

        // Check if cash field changed
        if (colDef.field?.startsWith("cash_")) {
            updateTotal("cash", "total_cash");
        }

        if (colDef.field?.startsWith("cost_")) {
            updateTotal("cost", "total_cost");
        }

        if (colDef.field === 'budget_5yp' || colDef.field === 'num_of_year_budget' || colDef.field === 'start_year') {
            budgetDistribute(data['budget_5yp'], data['num_of_year_budget']);
        }

        try {
            const response = await fetch(`/budgets/${data.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Failed to update");
            }

            console.log("Saved successfully", result.data);
        } catch (error) {
            console.error("Update error:", error);
            alert("Failed to update data. Please try again.");
        }
    };



    const handleFullscreen = () => {
        const elem = gridRef.current;
        if (!elem) {
            console.error("Grid container not found");
            return;
        }
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        } else if (elem.mozRequestFullScreen) {
            elem.mozRequestFullScreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
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
            <ContainerWrapper>
                <div className="mb-4 flex justify-between">
                    <button
                        onClick={() => window.history.back()}
                        className="inline-flex items-center px-4 py-2 bg-red-500 text-white text-sm font-semibold rounded-lg shadow hover:bg-red-700 transition-all duration-200"
                    >
                        <svg
                            className="w-5 h-5 mr-2"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
                        </svg>
                        Back
                    </button>
                    <button
                        onClick={handleFullscreen}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-700"
                    >
                        ⛶ Fullscreen
                    </button>
            </div>
                <CardWrapper>
                    <div ref={gridRef} className="ag-theme-alpine" style={{ height: "calc(100vh - 150px)", width: "100%" }}>
                        <AgGridReact
                            rowData={rowData}
                            columnDefs={columnDefs}
                            defaultColDef={defaultColDef}
                            // pagination={true}
                            // paginationPageSize={20}
                            onCellValueChanged={onCellValueChanged}
                            rowHeight={30}
                        />
                    </div>
                </CardWrapper>
            </ContainerWrapper>
        </AuthenticatedLayout>
    )
}
