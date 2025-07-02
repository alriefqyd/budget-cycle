import {useEffect, useState, useRef, useMemo} from "react"
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
    RenderApiModule,
    CellStyleModule,
    RowSelectionModule,
    HighlightChangesModule,
    UndoRedoEditModule
} from 'ag-grid-community';
import {data} from "autoprefixer";

ModuleRegistry.registerModules([
    ClientSideRowModelModule,
    TextFilterModule,
    NumberFilterModule,
    PaginationModule,
    NumberEditorModule,
    TextEditorModule,
    SelectEditorModule,
    ClientSideRowModelApiModule,
    RenderApiModule,
    CellStyleModule,
    RowSelectionModule,
    HighlightChangesModule,
    UndoRedoEditModule
]);

export default function Show() {
    const gridRef = useRef();
    const { projects, year, budgets } = usePage().props
    const [activeTab, setActiveTab] = useState('Tab1');
    const [selectedRow, setSelectedRow] = useState(null);

    const pathParts = window.location.pathname.split('/');
    const startYear = parseInt(pathParts[pathParts.length - 1]) || new Date().getFullYear();
    const endYear = startYear + 4;
    const yearlyBudget = startYear + 2;
    const month = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    const toSentenceCase = (str) => {
        if (!str) return "";
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    };
    const generateTwoYearYearly = (year,type) => {
        month.forEach((month,index) => {
            let color = 'custom-header-blue'
            if(type == 'cash') {
                color = 'custom-header-gray'
            }
            columnDefs.push({
                headerName: `${toSentenceCase(type)} ${month} - ${year}`,
                field: `${type}_${index+1}_${year}`,
                filter: 'agNumberColumnFilter',
                minWidth: 170,
                hide: activeTab === 'Tab1' ? true : false,
                headerClass: color,
                valueFormatter: params => formatCurrency(params.value),
            });
        });
    }

    const getMonthYear = (colDef, type) => {
        let fieldType = colDef.field.split("_")[0];
        const regex = new RegExp(`^${fieldType}_(\\d{1,2})_(\\d{4})$`);
        const match = colDef.field.match(regex);
        if(match) {
            let month = match[2].length > 0 ? match[1] : null;
            let year = match[2].length > 0 ? match[2] : match[1];

            if(month){
                month = parseInt(month,10);
            }

            year = parseInt(year, 10);

            if(type === 'month') {
                return month;
            }
            return year
        }
    }

    const replicateCostToCash = (data, colDef) => {
        let month = getMonthYear(colDef, 'month');
        let year = getMonthYear(colDef, 'year');
        const top = data['top'] ? parseInt(data['top']) : 1;
        let columnToReplicate = `cash_${month + top}_${year}`
        data[columnToReplicate] = data[colDef.field] || 0;
    }


    const columnDefs = [
        { headerName: "ID", field: "id", filter: 'agTextColumnFilter', pinned:'left', width: 40, hide:true},
        { headerName: "SAP Code", field: "sap_code", filter: 'agTextColumnFilter', pinned:'left', width: 40, checkboxSelection: true,
            headerCheckboxSelection: true},
        { headerName: "Project's Title", field: "project_title",pinned:'left', width: 300},
        { headerName: "Note", field: "note", filter: 'agTextColumnFilter' },
        { headerName: "Status", field: "status_progress", filter: 'agTextColumnFilter', cellEditor: 'agSelectCellEditor',cellEditorParams: {
                values: ['ongoing', 'new'],
            } },
        { headerName: "PM", field: "project_manager", filter: 'agTextColumnFilter', minWidth: 220 },
        { headerName: "PC", field: "project_control", filter: 'agTextColumnFilter', minWidth: 150 },
        { headerName: "Director", field: "directorate", filter: 'agTextColumnFilter', minWidth: 75 },
        { headerName: "Owner Area", field: "owner_area", filter: 'agTextColumnFilter', minWidth: 200 },
        { headerName: "Type of Investment", field: "type_of_investment", filter: 'agTextColumnFilter', minWidth:150, cellEditor: 'agSelectCellEditor',cellEditorParams: {
            values: ['English', 'Spanish', 'French', 'Portuguese'],
            } },
        { headerName: "Category", field: "category", filter: 'agTextColumnFilter', agTextColumnFilter: 'agTextColumnFilter', minWidth:150, cellEditor: 'agSelectCellEditor',cellEditorParams: {
            values: ['English', 'Spanish', 'French', 'Portuguese'],
            } },
        { headerName: "Risk", field: "risk", filter: 'agTextColumnFilter', minWidth: 50 },
        { headerName: "Budget Car", field: "budget_car", filter: 'agTextColumnFilter',minWidth: 150, valueFormatter: params => formatCurrency(params.value) },
        { headerName: "Actual to Date", field: "actual_to_date", filter: 'agTextColumnFilter', minWidth: 150, valueFormatter: params => formatCurrency(params.value) },
        { headerName: "Budget 5YP", field: "budget_5yp", filter: 'agNumberColumnFilter', minWidth: 150, valueFormatter: params => formatCurrency(params.value)}, // Use number filter if this is numeric]
        { headerName: "Start Year", field: "start_year", filter: 'agTextColumnFilter' , cellEditor: 'agSelectCellEditor',cellEditorParams: () =>     {
                const values = [];
                for (let year = startYear; year <= endYear; year++) {
                    values.push(year.toString()); // Must be strings
                }
                return { values };
            } },
        { headerName: "Budget Year", field: "num_of_year_budget", filter: 'agTextColumnFilter', minWidth: 150, cellEditor: "agSelectCellEditor",
            cellEditorParams: (params) => {
                const values = [];
                const start = parseInt(params.data?.start_year) || new Date().getFullYear();
                const maxYears = endYear - start + 1;

                for (let num = 1; num <= 5; num++) {
                    if (num <= maxYears) {
                        values.push(num.toString()); // must be string
                    }
                }

                return { values };
            }
        },
        { headerName: "FM New", field: "fm_new", filter: 'agTextColumnFilter' },
        { headerName: "Top",  field: "top", filter: 'agTextColumnFilter', minWidth:90, hide: activeTab === 'Tab1' ? true : false, cellEditor: "agSelectCellEditor", enableCellChangeFlash: true,
            cellEditorParams: (params) => {
                const values = [];
                for (let num = 1; num < 12; num++) {
                    values.push(num.toString()); // must be string
                }

                return { values };
            }

        }
    ]

    for (let year = startYear; year <= endYear; year++) {
        if(year < yearlyBudget) {
            generateTwoYearYearly(year,'cost')
            columnDefs.push(
                {
                    headerName: `Total`,
                    field: `total_cost_${year}`,
                    filter: 'agNumberColumnFilter',
                    minWidth: 170,
                    headerClass: 'custom-header-red',
                    editable:false,
                    hide: activeTab === 'Tab1'  ? true : false,
                    valueFormatter: params => formatCurrency(params.value),
                }
            )
        }
        let hide = activeTab === 'Tab1' || (activeTab == 'Tab2' && year < yearlyBudget) ? false : true

        columnDefs.push(
        {
            headerName: `Cost - ${year}`,
            field: `cost_${year}`,
            filter: 'agNumberColumnFilter',
            minWidth: 150,
            hide: hide,
            headerClass:'custom-header-orange',
            valueFormatter: params => formatCurrency(params.value)
        }
        );

        if(year < yearlyBudget){
            columnDefs.push(
                {
                    headerName: `Cost - ${year} - Remaining`,
                    field: `cost_${year}_remaining`,
                    filter: 'agNumberColumnFilter',
                    minWidth: 220,
                    hide: activeTab === 'Tab1'  ? true : false,
                    headerClass:'custom-header-green-2',
                    cellClassRules: {
                        'negative-value': params => params.value < 0,
                        'positive-value': params => params.value >= 0
                    }
                }
            )
        }
    }

    columnDefs.push({
            headerName: "Cost Total",
            field: `total_cost`,
            filter: 'agTextColumnFilter',
            minWidth: 150,
            editable:false,
            headerClass:'custom-header-orange',
            hide: activeTab === 'Tab1' ? false : true,
            valueFormatter: params => formatCurrency(params.value)
        },
        {
            headerName: "Cost Remaining",
            field: 'cost_remaining',
            filter: 'agTextColumnFilter',
            minWidth: 150,
            editable: false,
            headerClass:'custom-header-orange',
            hide: activeTab === 'Tab1' ? false : true,
            valueFormatter: params => formatCurrency(params.value),
            cellClassRules: {
                'negative-value': params => params.value < 0,
                'positive-value': params => params.value >= 0
            }
        })

    for (let year = startYear; year <= endYear; year++) {
        if(year < yearlyBudget) {
            generateTwoYearYearly(year,'cash')
            columnDefs.push(
                {
                    headerName: `Total Cash - ${year}`,
                    field: `total_cash_${year}`,
                    filter: 'agNumberColumnFilter',
                    minWidth: 170,
                    headerClass: 'custom-header-red',
                    editable:false,
                    hide: activeTab === 'Tab1'  ? true : false,
                    valueFormatter: params => formatCurrency(params.value),
                }
            )
        }
        let hide = activeTab === 'Tab1' || (activeTab == 'Tab2' && year < yearlyBudget) ? false : true
        columnDefs.push({
            headerName: `Cash - ${year}`,
            field: `cash_${year}`,
            filter: 'agNumberColumnFilter',
            minWidth: 150,
            headerClass:'custom-header-green',
            valueFormatter: params => formatCurrency(params.value),
            hide: hide,
        });

        if(year < yearlyBudget){
            columnDefs.push(
                {
                    headerName: `Cash - ${year} - Remaining`,
                    field: `cash_${year}_remaining`,
                    filter: 'agNumberColumnFilter',
                    minWidth: 220,
                    hide: activeTab === 'Tab1' ? true : false,
                    headerClass:'custom-header-green',
                    cellClassRules: {
                        'negative-value': params => params.value < 0,
                        'positive-value': params => params.value >= 0
                    }
                }
            )
        }
    }

    columnDefs.push(
        {
            headerName: "Cash Total",
            field: `total_cash`,
            filter: 'agTextColumnFilter',
            minWidth: 150,
            editable:false,
            headerClass:'custom-header-green',
            hide: activeTab === 'Tab1' ? false : true,
            valueFormatter: params => formatCurrency(params.value)
        },
        {
            headerName: "Cash Remaining",
            field: 'cash_remaining',
            filter: 'agTextColumnFilter',
            minWidth: 150,
            editable:false,
            headerClass:'custom-header-green',
            hide: activeTab === 'Tab1' ? false : true,
            valueFormatter: params => formatCurrency(params.value),
            cellClassRules: {
                'negative-value': params => params.value < 0,
                'positive-value': params => params.value >= 0
            }
        }
    )

    // const [rowData, setRowData] = useState([]);
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
    const formatCurrency = (value) => {
        if (value == null || isNaN(value)) return '';
        return Number(value).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    const handleAddNewRow = () => {
        const newRow = {
            id: null,
            sap_code: '',
            project_title: '',
            note: '',
            status_progress: 'new',
            project_manager: '',
            project_control: '',
            directorate: '',
            owner_area: '',
            type_of_investment: '',
            category: '',
            risk: '',
            budget_car: 0,
            actual_to_date: 0,
            budget_5yp: 0,
            start_year: startYear,
            num_of_year_budget: 1,
            fm_new: '',
            top: 1,
            total_cash: 0,
            total_cost: 0,
            cash_remaining: 0,
            cost_remaining: 0
        };

        for (let year = startYear; year <= endYear; year++) {
            newRow[`cost_${year}`] = 0;
            newRow[`cash_${year}`] = 0;
            newRow[`cost_${year}_remaining`] = 0;
            newRow[`cash_${year}_remaining`] = 0;

            for (let i = 1; i <= 12; i++) {
                newRow[`cost_${i}_${year}`] = 0;
                newRow[`cash_${i}_${year}`] = 0;
            }
        }

        agGridRef.current.api.applyTransaction({ add: [newRow], addIndex: 0 });
    };

    const handleDuplicateRow = async () => {
        const duplicatedRows = selectedRowsState.map(row => ({
            ...row,
            sap_code: 'COPY_' + (row['sap_code'] ? row['sap_code'] : 'XXXXX'),
            year: startYear,
        }));

        if(duplicatedRows.length < 1) {
            return false;
        }

        setRowData(prev => [...prev, ...duplicatedRows]);

        const response = await fetch('/budgets/duplicate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
                'Accept': 'application/json'
            },
            body: JSON.stringify(duplicatedRows)
        })

        const result = await response.json();
        if (!response.ok) {
            console.error("Failed to duplicate budget record:", result);
            alert("An error occurred while duplicate the data. Please try again.");
        }

        agGridRef.current.api.applyTransaction({ update: [duplicatedRows] });

        console.log(result.message);
    };

    const [selectedRowsState, setSelectedRowsState] = useState([]);


    const onSelectionChanged = () => {
        const api = agGridRef.current.api;
        const currentlySelected = api.getSelectedRows();

        setSelectedRowsState((prevSelected) => {
            const currentlySelectedIds = currentlySelected.map(row => row.id);

            const updated = prevSelected.filter(row => currentlySelectedIds.includes(row.id));

            currentlySelected.forEach(row => {
                if (!updated.find(r => r.id === row.id)) {
                    updated.push(row);
                }
            });

            return updated;
        });
    };

    const onCellValueChanged = async (params) => {
        const { data, colDef, api, node } = params;

        const budgetDistributeMonthly = (budgetPerYear, year) => {
            let budgetPerMonth = 0;
            if(year < yearlyBudget && year >= data['start_year']) {
                budgetPerMonth = budgetPerYear / 12;
            }

            month.forEach((month,index) => {
                data[`cost_${index+1}_${year}`] = budgetPerMonth;
            })
        }
        const budgetDistribute = (budgets, years) => {
            const budgetPerYear = budgets / years;
            const newStartYear = parseInt(data['start_year']);
            const newEndYear = newStartYear + parseInt(years) - 1;

            for (let year = startYear; year <= endYear; year++) {
                let fieldCost = `cost_${year}`;
                let fieldCash = `cash_${year}`;
                if (year >= newStartYear && year <= newEndYear) {
                    data[fieldCash] = budgetPerYear;
                    data[fieldCost] = budgetPerYear;
                } else {
                    data[fieldCash] = 0;
                    data[fieldCost] = 0;
                }
                budgetDistributeMonthly(budgetPerYear, year)
            }

            if(colDef.field === 'budget_5yp'){
                data['total_cash'] = budgets;
            } else {
                data['budget_5yp'] = budgets;
            }

            updateTotal('cash','total_cash');
            updateTotal('cost','total_cost');

            api.refreshCells({
                rowNodes: [node],
                force: true
            });
        };

        const countBudgetRemaining = (total,totalField) => {
            data[totalField] = total;
            if(totalField === "total_cash"){
                let rem = parseFloat(data['budget_5yp']) - total;
                data['cash_remaining'] = rem;
            }
            if(totalField === "total_cost"){
                let rem = parseFloat(data['budget_5yp']) - total;
                data['cost_remaining'] = rem;
            }
        }

        const updateTotal = (prefix, totalField) => {
            let total = 0;
            for (let year = startYear; year <= endYear; year++) {
                const field = `${prefix}_${year}`;
                const value = parseFloat(data[field]) || 0;
                total += value;
            }
            countBudgetRemaining(total, totalField);
            api.refreshCells({
                rowNodes: [node],
                columns: [totalField, 'cash_remaining','cost_remaining',`${prefix}_${year}_remaining`],
                force: true
            });
        };

        const cashDistribute = (data) => {
            const cash = {};
            let budgetYear = 0;
            for (let i = 0; i < 12; i++) {
                const costMonth = i;
                const cashMonthIndex = i + (data['top'] ? parseInt(data['top'])  : 0);
                budgetYear += data[`cost_${i}_${year}`];
                if (cashMonthIndex <= 12) {
                    const cashMonth = cashMonthIndex;
                    [startYear, startYear + 1].forEach((year) => {
                        data[`cash_${cashMonthIndex}_${year}`] = data[`cost_${i}_${year}`];
                        data[`cash_${year}_remaining`] = 0;
                        data[`cost_${year}_remaining`] = 0;
                    })
                }
            }

            return cash;
        }

        const updateCostMonthlyRemaining = (value, column) => {
            let month = getMonthYear(column, 'month');
            let year = getMonthYear(column, 'year');

            if(!year){
                year = column.field.split('_')[1];
            }

            let type = column.field.split("_")[0]; // "cost" or "cash"
            let total = 0;

            Object.keys(value).forEach((key) => {
                const regex = new RegExp(`^${type}_(\\d{1,2})_${year}$`);
                if (regex.test(key)) {
                    total += parseFloat(value[key] || 0);
                }
            });

            let remaining = parseInt(value[`${type}_${year}`]) - total
            value[`${type}_${year}_remaining`] = remaining;
            value[`total_${type}_${year}`] = total;

            api.refreshCells({
                rowNodes: [node],
                force: true
            });
        };

        const updateTotalMonthly = (type, year) => {
            let total = 0;
            month.forEach((month,index) => {
                total += parseFloat(data[`${type}_${index+1}_${year}`]);
            });
            data[`total_${type}_${year}`] = total;
        }


        // Check if cash field changed
        if (/^cash_\d{4}$/.test(colDef.field)) {
            updateTotal("cash", "total_cash");
            updateCostMonthlyRemaining(data, colDef)
        }

        if (/^cost_\d{4}$/.test(colDef.field)) {
            const budgetPerYear = data['budget_5yp'] / data['num_of_year_budget']
            const year = colDef.field.split("_")[1];
            const type = colDef.field.split("_")[0];

            updateTotal("cost", "total_cost");
            if(activeTab === 'Tab1'){
                budgetDistributeMonthly(budgetPerYear, parseInt(year))
            }
            updateCostMonthlyRemaining(data, colDef)
            updateTotalMonthly('cost',year)

            api.refreshCells({
                rowNodes: [node],
                force: true
            });

        }

        if(/^cost_(1[0-2]|[1-9])_\d{4}$/.test(colDef.field)) {
            replicateCostToCash(data, colDef)
            updateCostMonthlyRemaining(data, colDef)
            updateTotalMonthly('cost', colDef.field.split("_")[2])

        }

        if(/^cash_(1[0-2]|[1-9])_\d{4}$/.test(colDef.field)) {
            updateCostMonthlyRemaining(data, colDef)
            updateTotalMonthly('cash',colDef.field.split("_")[2])
        }

        if (colDef.field === 'budget_5yp' || colDef.field === 'num_of_year_budget' || colDef.field === 'start_year') {
            budgetDistribute(data['budget_5yp'], data['num_of_year_budget']);
        }

        if(colDef.field === 'total_cash'){
            budgetDistribute(data['total_cash'], data['num_of_year_budget']);
        }

        if(colDef.field === 'top'){
            cashDistribute(data)
        }

        try {
            const isNew = !data.id; // if no ID, it's new
            data['year_period'] = startYear

            const response = await fetch(isNew ? '/budgets' : `/budgets/${data.id}`, {
                method: isNew ? 'POST' : 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data)
            })

            const result = await response.json();
            if (!response.ok) {
                console.error("Failed to update budget record:", result);
                alert("An error occurred while updating the data. Please try again.");
            }

            if (isNew && result.data?.id) {
                data.id = result.data.id;
                agGridRef.current.api.applyTransaction({ update: [data] });
            }

            console.log(result.message);
        } catch (error) {
            console.error("Update error:", error);
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

    const agGridRef = useRef(); // <--- Add this

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Dashboard
                </h2>
            }
        >
            <ContainerWrapper>
                <div className="mb-4 flex">
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
                        className="px-4 py-2 ml-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-700"
                    >
                        ⛶ Fullscreen
                    </button>
                    <button
                        onClick={handleAddNewRow}
                        className="px-4 py-2 ml-2 bg-green-500 text-white rounded-lg shadow hover:bg-green-700"
                    >
                        + Add New Row
                    </button>
                </div>
                <div className="flex float-end">
                    <button onClick={handleDuplicateRow}
                            className="px-4 py-2 ml-2 bg-green-500 text-white rounded-lg shadow hover:bg-green-700"
                    >
                        Duplicate
                    </button>
                </div>
                <CardWrapper mb="mb-3">
                    <div className="space-x-4">
                        <button
                            className={`px-4 py-2 ${activeTab === 'Tab1' ? 'border-b-2 border-yellow-500 text-teal-700 font-semibold' : ''}`}
                            onClick={() => {
                                setActiveTab('Tab1');
                            }}
                        >
                            Budget 5 Years
                        </button>
                        <button
                            className={`px-4 py-2 ${activeTab === 'Tab2' ? 'border-b-2 border-yellow-500 text-teal-700 font-semibold' : ''}`}
                            onClick={() => {
                                setActiveTab('Tab2');
                            }}
                        >
                            Budget Yearly
                        </button>
                    </div>
                </CardWrapper>
                    <CardWrapper>
                        <div ref={gridRef} className="ag-theme-alpine"
                             style={{height: "calc(100vh - 150px)", width: "100%"}}>
                            <AgGridReact
                                ref={agGridRef}
                                rowData={rowData}
                                columnDefs={columnDefs}
                                defaultColDef={defaultColDef}
                                // pagination={true}
                                // paginationPageSize={20}
                                onCellValueChanged={onCellValueChanged}
                                rowSelection="multiple"
                                suppressRowClickSelection={true}
                                undoRedoCellEditing={5}
                                undoRedoCellEditingLimit={5}
                                onSelectionChanged={onSelectionChanged}
                            />
                        </div>
                    </CardWrapper>
            </ContainerWrapper>
        </AuthenticatedLayout>
    )
}

// any change will re count the cell
