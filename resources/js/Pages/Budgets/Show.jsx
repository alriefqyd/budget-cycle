import {useEffect, useState, useRef, useMemo} from "react"
import {Link, usePage} from "@inertiajs/react"
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
    UndoRedoEditModule,
    RowApiModule,
    PinnedRowModule
} from 'ag-grid-community';
import UploadModal from "@/Components/Budgets/UploadModal.jsx";
import UploadModalDetail from "@/Components/Budgets/UploadModalDetail.jsx";
import Swal from "sweetalert2";
import {Spinner} from "@/Components/Spinner.jsx";


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
    UndoRedoEditModule,
    RowApiModule,
    PinnedRowModule
]);

export default function Show() {
    const gridRef = useRef();
    const lastUpdatedId = useRef(null);
    const { projects, year, budgets } = usePage().props
    const [activeTab, setActiveTab] = useState('Tab1');
    const [selectedRow, setSelectedRow] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);  // <-- loading state

    const pathParts = window.location.pathname.split('/');
    const startYear = parseInt(pathParts[pathParts.length - 1]) || new Date().getFullYear();
    const endYear = startYear + 4;
    const yearlyBudget = startYear + 2;
    const month = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const [selectedRowsState, setSelectedRowsState] = useState([]);
    const [budgetTotalYear, setBudgetTotalYear] = useState(0);

    // useEffect(() => {
    //     // const channel = window.Echo.channel('budgets')
    //     //     .listen('.budgets.update', (event) => {
    //     //        setRowData(event.data);
    //     //     });
    //
    //     // this is websocket handshake (subscribtion) running once component rendered
    //     const channel = window.Echo.channel('budgets')
    //         .listen('.budgets.update', (event) => {
    //             const updatedRow = event.data; // should be a plain object
    //             const agGridApi = agGridRef.current.api;
    //             const rowNode = agGridApi.getRowNode(String(updatedRow.id));
    //             if(!rowNode){
    //                 setRowData(prev => ({
    //                     ...prev,
    //                     data: updatedRow
    //                 }));
    //
    //                 agGridRef.current.api.applyTransaction({ add: [updatedRow], addIndex: 0 });
    //             } else {
    //                 rowNode.setData(updatedRow);
    //                 agGridApi.flashCells({ rowNodes: [rowNode], columns: Object.keys(updatedRow) });
    //             }
    //         });
    // }, []);

    useEffect(() => {
        const channel = window.Echo.channel('budgets')
            .listen('.budgets.update', (event) => {
                const updatedRow = event.data;
                const agGridApi = agGridRef.current.api;
                if (!agGridApi || !updatedRow?.id) return;

                if (updatedRow.id === lastUpdatedId.current) {
                    lastUpdatedId.current = null; // clear it
                    return;
                }

                const rowNode = agGridApi.getRowNode(String(updatedRow.id));

                if (!rowNode) {
                    setRowData(prev => ({
                        ...prev,
                        data: updatedRow
                    }));
                    agGridApi.applyTransaction({ add: [updatedRow], addIndex: 0 });
                } else {
                    rowNode.setData(updatedRow);
                    agGridApi.flashCells({
                        rowNodes: [rowNode],
                        columns: Object.keys(updatedRow),
                    });

                    const displayedRows = [];
                    agGridApi.forEachNodeAfterFilterAndSort((node) => {
                        displayedRows.push(node.data);
                    });

                    const updatedTotals = calculateTotals(displayedRows);

                    const pinnedRow = agGridApi.getPinnedTopRow(0);
                    if (pinnedRow) {
                        pinnedRow.setData(updatedTotals[0]);
                    }
                }
            });

        return () => {
            channel.stopListening('.budgets.update');
        };
    }, []);

    // const [rowData, setRowData] = useState([]);
    const [rowData, setRowData] = useState([]);
    useEffect(() => {
        setRowData(budgets);
    }, [budgets]);

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
        { headerName: "ID", field: "id", filter: 'agTextColumnFilter', pinned:'left', width: 40, hide:false},
        { headerName: "SAP Code", field: "sap_code", filter: 'agTextColumnFilter', pinned:'left', width: 40, checkboxSelection: true,
            headerCheckboxSelection: true},
        { headerName: "Project's Title", field: "project_title",pinned:'left', width: 300},
        { headerName: "Note", field: "note", filter: 'agTextColumnFilter' },
        { headerName: "Status", field: "status_progress", filter: 'agTextColumnFilter', cellEditor: 'agSelectCellEditor',cellEditorParams: {
                values: ['ongoing', 'new', 'new bc'],
            } },
        { headerName: "PM", field: "project_manager", filter: 'agTextColumnFilter', minWidth: 220 },
        { headerName: "PC", field: "project_control", filter: 'agTextColumnFilter', minWidth: 150 },
        { headerName: "Directorate", field: "directorate", filter: 'agTextColumnFilter', minWidth: 75 },
        { headerName: "Owner Area", field: "owner_area", filter: 'agTextColumnFilter', minWidth: 200 },
        { headerName: "Type of Investment", field: "type_of_investment", filter: 'agTextColumnFilter', minWidth:150, cellEditor: 'agSelectCellEditor',cellEditorParams: {
            values: ['True Sustaining', 'One-off'],
            } },
        { headerName: "Category", field: "category", filter: 'agTextColumnFilter', agTextColumnFilter: 'agTextColumnFilter', minWidth:150, cellEditor: 'agSelectCellEditor',cellEditorParams: {
            values: ['Process Facilities',
                'Power',
                'Process Facilities',
                'Mine Development',
                'HSE',
                'TECHNOLOGY',
                'Administrative',
                'Mobile Equipment',
                'Tailings, Dams and Piles',
            ],
            } },
        { headerName: "Risk Residual", field: "risk_residual", filter: 'agTextColumnFilter', minWidth: 50,enableCellChangeFlash: false },
        { headerName: "Risk Forecast", field: "risk_forecast", filter: 'agTextColumnFilter', minWidth: 50,enableCellChangeFlash: false },
        { headerName: "BC Budget", field: "bc_budget", cellRenderer: "agAnimateShowChangeCellRenderer", enableCellChangeFlash: false, filter: 'agTextColumnFilter',minWidth: 150, valueFormatter: params => formatCurrency(params.value) },
        { headerName: "Approved Budget", field: "budget_car", cellRenderer: "agAnimateShowChangeCellRenderer", enableCellChangeFlash: false, filter: 'agTextColumnFilter',minWidth: 150, valueFormatter: params => formatCurrency(params.value) },
        {
            headerName: "Actual Up to 2024 ",
            children: [
                {
                    headerName: "Cost",
                    field: "actual_to_date_cost",
                    enableCellChangeFlash: false,
                    filter: 'agTextColumnFilter',
                    minWidth: 150,
                    valueFormatter: params => formatCurrency(params.value),
                },
                {
                    headerName: "Cash",
                    field: "actual_to_date",
                    enableCellChangeFlash: false,
                    filter: 'agTextColumnFilter',
                    minWidth: 150,
                    valueFormatter: params => formatCurrency(params.value)
                },
            ]
        },
        {
            headerName: "A/F 2025",
            children: [
                { headerName: "Cost", field: "forecast_cost", enableCellChangeFlash: false, filter: 'agNumberColumnFilter', minWidth: 150, valueFormatter: params => formatCurrency(params.value)}, // Use number filter if this is numeric]
                { headerName: "Cash", field: "forecast_cash", enableCellChangeFlash: false, filter: 'agNumberColumnFilter', minWidth: 150, valueFormatter: params => formatCurrency(params.value)} // Use number filter if this is numeric]
            ]
        },
        {
            headerName: 'Budget 5YP',
            children: [
                { headerName: "Cost", field: "budget_5yp_cost", enableCellChangeFlash: false, filter: 'agNumberColumnFilter', minWidth: 150, valueFormatter: params => formatCurrency(params.value)},
                { headerName: "Cash", field: "budget_5yp", enableCellChangeFlash: false, filter: 'agNumberColumnFilter', minWidth: 150, valueFormatter: params => formatCurrency(params.value)},
            ]
        },

       { headerName: "Start Year", field: "start_year", enableCellChangeFlash: false, filter: 'agTextColumnFilter' , cellEditor: 'agSelectCellEditor',cellEditorParams: () =>     {
                const values = [];
                for (let year = startYear; year <= endYear; year++) {
                    values.push(year.toString()); // Must be strings
                }
                return { values };
            } },
        { headerName: "Budget Year", field: "num_of_year_budget", filter: 'agTextColumnFilter', enableCellChangeFlash: false, minWidth: 150, cellEditor: "agSelectCellEditor",
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
        { headerName: "Fund", field: "fm_new", enableCellChangeFlash: false, filter: 'agTextColumnFilter' },
        { headerName: "Top",  field: "top",  filter: 'agTextColumnFilter', minWidth:90, hide: activeTab === 'Tab1' ? true : false, cellEditor: "agSelectCellEditor", enableCellChangeFlash: false,
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
                    enableCellChangeFlash: false,
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
            enableCellChangeFlash: false,
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
                    enableCellChangeFlash: false,
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
            enableCellChangeFlash: false,
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
            enableCellChangeFlash: false,
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
                    enableCellChangeFlash: false,
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
            enableCellChangeFlash: false,
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
                    enableCellChangeFlash: false,
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
            enableCellChangeFlash: false,
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
            enableCellChangeFlash: false,
            headerClass:'custom-header-green',
            hide: activeTab === 'Tab1' ? false : true,
            valueFormatter: params => formatCurrency(params.value),
            cellClassRules: {
                'negative-value': params => params.value < 0,
                'positive-value': params => params.value >= 0
            }
        }
    )

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

    const handleImport = async (data) => {
        setLoading(true)
        const formData = new FormData();
        formData.append("file", data.file)
        formData.append("year", data.year)

        try {
            const response = await axios.post('/budgets/import-project', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })

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
        }
    }

    const handleExport = async () => {
        setLoading(true);
        const response = await fetch('/export/budgets', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
                'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            },
            body: JSON.stringify({ year: startYear })
        });

        if (!response.ok) {
            console.error("Failed to export");
            return;
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `budget-cycle-${startYear}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        setLoading(false)
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
            risk_residual: '',
            risk_forecast: '',
            budget_car: 0,
            bc_budget : 0,
            actual_to_date: 0,
            budget_5yp: 0,
            start_year: startYear.toString(),
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

        setRowData(prev => ({
            ...prev,
            data: newRow
        }));

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

        agGridRef.current.api.applyTransaction({ add: result.data, addIndex: 0 });
    };
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

    const calculateTotals = (rowData) => {
        let totals = {
            sap_code: 'Total',
            title: '',
            total_cash:0,
            total_cost:0
        };
        for(let i = startYear; i< endYear + 1; i++){
            const cashField = `cash_${i}`;
            const costField = `cost_${i}`;
            totals[cashField] = 0;
            totals[costField] = 0;
        }

        const arrayData = Array.isArray(rowData)
            ? rowData
            : Object.keys(rowData)
                .filter(key => !isNaN(key)) // only numeric keys
                .map(key => rowData[key]);

        arrayData.forEach(row => {
            for (let i = startYear; i <= endYear; i++) {
                const cashField = `cash_${i}`;
                const costField = `cost_${i}`;
                totals[cashField] += parseNumber(row[cashField]);
                totals[costField] += parseNumber(row[costField]);
            }
            totals.total_cash += parseNumber(row.total_cash);
            totals.total_cost += parseNumber(row.total_cost);
        });



        return [totals];
    };

    const parseNumber = (val) => {
        if (!val) return 0;
        return typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0;
    };

    let suppressConfirm = false;
    const onCellValueChanged = async (params) => {
        const { data, colDef, api, node } = params;
        const field = params.colDef.field;
        const oldValue = params.oldValue;
        const newValue = params.newValue;


        // if (suppressConfirm) {
        //     suppressConfirm = false;
        //     return;
        // }
        // // Only show confirmation for these fields
        // const confirmFields = ['start_year', 'num_of_year_budget'];
        // // is column meet criteria?, if not than revert
        // if (!confirmFields.includes(field)) return;
        //
        // //is column have different value?, if not revert
        // if (oldValue === newValue) return;
        //
        // const result = await Swal.fire({
        //     title: 'Confirm Change',
        //     html: `Are you sure you want to change <b>${field}</b> from <b>${oldValue}</b> to <b>${newValue}</b>?`,
        //     icon: 'warning',
        //     showCancelButton: true,
        //     confirmButtonText: 'Yes, change it',
        //     cancelButtonText: 'No, cancel',
        //     reverseButtons: true
        // });
        //
        // if (!result.isConfirmed) {
        //     suppressConfirm = true; // prevent re-trigger
        //     params.node.setDataValue(field, oldValue);
        //     return;
        // }

        const calculateTotalBudget = (api) => {
            const totals = {
                sap_code: 'Total',
                title: '',
                total_cash: 0,
                total_cost: 0,
            };

            // Initialize dynamic year-based fields
            for (let year = startYear; year <= endYear + 1; year++) {
                totals[`cash_${year}`] = 0;
                totals[`cost_${year}`] = 0;
            }

            // Sum values dynamically
            api.forEachNode((node) => {
                const row = node.data;
                if (row.sap_code === 'Total') return; // Skip total row

                for (let year = startYear; year <= endYear; year++) {
                    totals[`cash_${year}`] += parseNumber(row[`cash_${year}`]);
                    totals[`cost_${year}`] += parseNumber(row[`cost_${year}`]);
                }

                totals.total_cash += parseNumber(row.total_cash);
                totals.total_cost += parseNumber(row.total_cost);
            });

            return [totals];
        };

        const budgetDistributeMonthly = (budgetPerYear, year) => {
            let budgetPerMonth = 0;
            if(year < yearlyBudget && year >= data['start_year']) {
                budgetPerMonth = budgetPerYear / 12;
            }

            month.forEach((month,index) => {
                data[`cost_${index+1}_${year}`] = budgetPerMonth;
            })
        }
        const budgetDistribute = (data) => {
            const years = data['num_of_year_budget'];
            /* if budget 5yp minus, than will distribute 0 */
            const budgetPerYear = data['budget_5yp'] > 0 ? data['budget_5yp'] / years : 0;
            const budgetCostPerYear = data['budget_5yp_cost'] > 0 ? data['budget_5yp_cost'] / years : 0;
            const newStartYear = parseInt(data['start_year']);
            const newEndYear = newStartYear + parseInt(years) - 1;

            //distribute budget cash cost based on start year
            for (let year = startYear; year <= endYear; year++) {
                let fieldCost = `cost_${year}`;
                let fieldCash = `cash_${year}`;
                //check if start yaer is exist and not zero
                if(data['start_year'] !== null && data['start_year'] > 2000){
                    if (year >= newStartYear && year <= newEndYear) {
                        data[fieldCash] = budgetPerYear;
                        data[fieldCost] = budgetCostPerYear;
                    } else {
                        data[fieldCash] = 0;
                        data[fieldCost] = 0;
                    }
                }

                budgetDistributeMonthly(budgetPerYear, year)
            }

            // if(colDef.field === 'budget_5yp'){
            //     data['total_cash'] = budgets;
            // } else {
            //     data['budget_5yp'] = budgets;
            // }

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
                let rem = parseFloat(data['budget_5yp_cost']) - total;
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

        const defineBudget5YP = (type) => {
            let budget5yp = 0;
            let budgetCar = data['budget_car'];
            const forecast = data[`forecast_${type}`];
            // let total = budgetCar - data['actual_to_date'] - forecast;

            data['budget_5yp_cost'] = budgetCar - data['actual_to_date_cost'] - data['forecast_cost']
            data['budget_5yp'] = budgetCar - data['actual_to_date'] - data['forecast_cash']

            // if(forecast == null) {
            //     data['budget_5yp_cost'] = budgetCar - data['actual_to_date_cost'] - data['forecast_cost']
            //     data['budget_5yp'] = budgetCar - data['actual_to_date'] - data['forecast_cash']
            // } else {
            //     if(type == 'cost'){
            //         data[`budget_5yp_cost`] = total;
            //     } else {
            //         data['budget_5yp'] = total
            //     }
            // }

            api.refreshCells({
                rowNodes: [node],
                force: true
            });
        }

        const updateTotalYearlyCostCash = () => {
            const updatedTotals = calculateTotalBudget(api);
            const gridApi = agGridRef.current.api;
            // Update the Total row in the main grid
            const pinnedRow = gridApi.getPinnedTopRow(0);
            if (pinnedRow) {
                pinnedRow.data = updatedTotals[0] // access the pinned row's data
            }
            api.forEachNode((node) => {
                if (node.data.sap_code === 'Total') {
                    api.applyTransaction({
                        update: [{
                            ...node.data,
                            ...updatedTotals[0],
                        }]
                    });
                }
            });

        }


        // Check if cash field changed
        if (/^cash_\d{4}$/.test(colDef.field)) {
            updateTotal("cash", "total_cash");
            updateCostMonthlyRemaining(data, colDef)
            updateTotalYearlyCostCash()

            api.refreshCells({ force: true });
        }

        if (/^cost_\d{4}$/.test(colDef.field)) {
            const budgetPerYear = data['budget_5yp'] / data['num_of_year_budget']
            const year = colDef.field.split("_")[1];

            updateTotal("cost", "total_cost");

            if (activeTab === 'Tab1') {
                budgetDistributeMonthly(budgetPerYear, parseInt(year));
            }

            updateCostMonthlyRemaining(data, colDef);
            updateTotalMonthly('cost', year);
            updateTotalYearlyCostCash()


            // Refresh all cells (not just one node)
            api.refreshCells({ force: true });
        }

        if(/^cost_(1[0-2]|[1-9])_\d{4}$/.test(colDef.field)) {
            replicateCostToCash(data, colDef)
            updateCostMonthlyRemaining(data, colDef)
            updateTotalMonthly('cost', colDef.field.split("_")[2])
            calculateTotalBudget(data)

        }

        if(/^cash_(1[0-2]|[1-9])_\d{4}$/.test(colDef.field)) {
            updateCostMonthlyRemaining(data, colDef)
            updateTotalMonthly('cash',colDef.field.split("_")[2])
            calculateTotalBudget(data)
        }

        if (colDef.field === 'budget_5yp' || colDef.field === 'budget_5yp_cost' || colDef.field === 'num_of_year_budget' || colDef.field === 'start_year') {
            budgetDistribute(data);
            calculateTotalBudget(data)
        }

        /*if(colDef.field === 'total_cash'){
            budgetDistribute(data['total_cash'], data['num_of_year_budget']);
        }*/

        if(colDef.field === 'top'){
            cashDistribute(data)
        }

        if(colDef.field === 'budget_car' || colDef.field === 'forecast_cost' || colDef.field === 'forecast_cash' ||
            colDef.field === 'actual_to_date' || colDef.field === 'actual_to_date_cost'
        ){
            let type = colDef.field.split("_")[1];
            //if type budget car
            if(type == 'car') {
                type = null
            }
            defineBudget5YP(type)
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

            // if (isNew && result.data?.id) {
            //     data.id = result.data.id;
            //     lastUpdatedId.current = data.id;
            //     agGridRef.current.api.applyTransaction({ update: [data] });
            // }

            // if (isNew && result.data?.id) {
            //     // Remove the old row with `id: null`
            //     agGridRef.current.api.applyTransaction({ remove: [params.data] });
            //
            //     // Assign new ID and re-add it
            //     const newRow = {
            //         ...data,
            //         id: result.data.id
            //     };
            //
            //     lastUpdatedId.current = newRow.id;
            //
            //     agGridRef.current.api.applyTransaction({ add: [newRow], addIndex: 0 });
            // }

            if (isNew && result.data?.id) {
                agGridRef.current.api.applyTransaction({ remove: [params.data] });
                const newRow = { ...data, id: result.data.id };
                lastUpdatedId.current = newRow.id;
                agGridRef.current.api.applyTransaction({ add: [newRow], addIndex: 0 });
            } else {
                lastUpdatedId.current = data.id;
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

    const handleDelete = async () => {

        if (!selectedRowsState || selectedRowsState.length === 0) {
            Swal.fire('No rows selected', 'Please select at least one row to delete.', 'warning');
            return;
        }

        const result = await Swal.fire({
            title: 'Are you sure?',
            text: 'This action will permanently delete the selected budgets!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete!',
            cancelButtonText: 'Cancel'
        });

        if (!result.isConfirmed) return;

        let selectedRows = selectedRowsState.map(row => ({
            ...row
        }));

        const ids = selectedRows.map(row => row.id);
        const query = ids.map(id => `ids[]=${id}`).join('&');

        try {

            const response = await fetch(`/budgets?${query}&year=${startYear}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Delete failed:', errorData);
                alert('Failed to delete budget.');
                return;
            }

            setRowData(prevData =>
                prevData.filter(row => !ids.includes(row.id))
            );

            // ✅ Optionally clear selection
            setSelectedRowsState([]);
        } catch (error) {
            console.error('Error deleting:', error);
            Swal.fire('Error', 'An unexpected error occurred.', 'error');
        }

    }

    const handleFinalize = async () => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: 'This action will finalize the selected budgets and increment the version!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, Finalize!',
            cancelButtonText: 'Cancel'
        });

        if (!result.isConfirmed) return;

        try {
            const response = await fetch(`/budgets-finalize/${startYear}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
                    'Accept': 'application/json'
                }
            });

            if(response.status === 200){
                Swal.fire({
                    icon: 'success',
                    title: 'Successfully Finalized',
                    text: response.message,
                    timer: 2000,
                    showConfirmButton: false,
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Finalized Error',
                    text: response.message,
                    timer: 2000,
                    showConfirmButton: false,
                });
            }

        } catch (e) {
            console.error('Error finalize:', e);
            Swal.fire('Error', 'An unexpected error occurred.', 'error');
        }

    }

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

                <nav className="flex items-center text-sm text-gray-500 mb-5" aria-label="Breadcrumb">
                    <ol className="inline-flex items-center space-x-1">
                        <li className="inline-flex items-center">
                            <Link href={'/dashboard'} className="text-gray-500 hover:text-gray-700">
                                Dashboard
                            </Link>
                        </li>
                        <li>
                            <span className="mx-2 text-gray-400">/</span>
                            <Link href={'/budgets'} className="text-gray-500 hover:text-gray-700">
                                Budgets
                            </Link>
                        </li>
                        <li>
                            <span className="mx-2 text-gray-400">/</span>
                            <span className="text-gray-700 font-medium">{startYear} - {endYear}</span>
                        </li>
                    </ol>
                </nav>

                <div className="float"></div>
                <div className="mb-1">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                        {/* Left side buttons */}
                        <div className="flex gap-1 flex-wrap">
                            <button
                                onClick={() => setShowModal(true)}
                                className="inline-flex items-center px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg shadow hover:bg-green-700 transition"
                            >
                                Import Data
                            </button>
                            <button
                                onClick={handleExport}
                                className="inline-flex items-center px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg shadow hover:bg-green-700 transition"
                            >
                                {loading ? (
                                    <>
                                        <Spinner/>
                                        <span className="ml-2">Export Data...</span>
                                    </>
                                ) : (
                                    'Export Data'
                                )}
                            </button>
                        </div>

                        {/* Right side buttons */}
                        <div className="flex gap-2 flex-wrap">
                            <button
                                onClick={handleDelete}
                                className="inline-flex items-center px-3 py-2 bg-red-800 text-white text-sm font-medium rounded-lg shadow hover:bg-red-700 transition"
                            >
                                🗑️ Delete Data
                            </button>
                            <button
                                onClick={handleDuplicateRow}
                                className="inline-flex items-center px-3 py-2 bg-yellow-500 text-white text-sm font-medium rounded-lg shadow hover:bg-yellow-600 transition"
                            >
                                ⧉ Duplicate
                            </button>
                            <button
                                onClick={handleFullscreen}
                                className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg shadow hover:bg-blue-700 transition"
                            >
                                ⛶ Full Screen
                            </button>
                        </div>
                    </div>
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
                            Budget Year To Date
                        </button>
                        <button className="float-end">
                            <button
                                onClick={handleFinalize}
                                className="inline-flex items-center px-3 py-2 bg-green-800 text-white text-sm font-medium rounded-lg shadow hover:bg-green-700 transition"
                            >
                                Finalize Budget Cycle
                            </button>
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
                            getRowId={params => params.data.id}
                            pinnedTopRowData={calculateTotals(rowData)}
                        />
                    </div>
                </CardWrapper>
            </ContainerWrapper>

            <UploadModalDetail
                show={showModal}
                onClose={() => {
                    if (!loading) setShowModal(false);
                }}
                onSubmit={handleImport}
                loading={loading}
            />
        </AuthenticatedLayout>
    )
}

// any change will re count the cell
