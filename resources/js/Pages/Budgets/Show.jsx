import {useEffect, useState, useRef, useMemo} from "react"
import {Link, usePage} from "@inertiajs/react"
import { AgGridReact } from "ag-grid-react"
import 'ag-grid-community/styles/ag-theme-alpine.css';
import "../../../css/ag-grid-custom.css";

import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout.jsx"
import { computeBudget5YP, distributeAnnualBudget, getCarVariance, getDistributionMismatch, toNum, formatCompact } from "@/Utils/budgetForecast.js"

import {
    ModuleRegistry,
    ClientSideRowModelModule,
    TextFilterModule,
    NumberFilterModule,
    CustomFilterModule,
    PaginationModule,
    NumberEditorModule,
    TextEditorModule,
    SelectEditorModule,
    CustomEditorModule,
    ClientSideRowModelApiModule,
    RenderApiModule,
    CellStyleModule,
    RowSelectionModule,
    HighlightChangesModule,
    UndoRedoEditModule,
    RowApiModule,
    PinnedRowModule,
    ColumnApiModule,
    ScrollApiModule,
    EventApiModule
} from 'ag-grid-community';
import Dropdown from "@/Components/Dropdown.jsx";
import ExcelStyleFilter from "@/Components/Budgets/ExcelStyleFilter.jsx";
import UploadModal from "@/Components/Budgets/UploadModal.jsx";
import UploadModalDetail from "@/Components/Budgets/UploadModalDetail.jsx";
import Swal from "sweetalert2";
import {Spinner} from "@/Components/Spinner.jsx";
import Modal from "@/Components/Modal.jsx";
import ProjectTrendChart from "@/Components/ProjectTrendChart.jsx";
import PinnableHeader from "@/Components/Budgets/PinnableHeader.jsx";
import AutocompleteCellEditor from "@/Components/Budgets/AutocompleteCellEditor.jsx";
import ForecastsDashboard from "@/Components/Budgets/ForecastsDashboard.jsx";
import ColumnVisibilityPanel, { TAB_CONTROLLED_FIELD } from "@/Components/Budgets/ColumnVisibilityPanel.jsx";


ModuleRegistry.registerModules([
    ClientSideRowModelModule,
    TextFilterModule,
    NumberFilterModule,
    CustomFilterModule,
    PaginationModule,
    NumberEditorModule,
    TextEditorModule,
    SelectEditorModule,
    CustomEditorModule,
    ClientSideRowModelApiModule,
    RenderApiModule,
    CellStyleModule,
    RowSelectionModule,
    HighlightChangesModule,
    UndoRedoEditModule,
    RowApiModule,
    PinnedRowModule,
    ColumnApiModule,
    ScrollApiModule,
    EventApiModule
]);

const STATUS_BADGE_COLORS = {
    'new': ['#dcfce7', '#15803d'],
    'new bc': ['#dcfce7', '#15803d'],
    'ongoing': ['#fef3c7', '#b45309'],
};

const StatusBadgeRenderer = (params) => {
    if (!params.value) return null;
    const [bg, fg] = STATUS_BADGE_COLORS[params.value.toLowerCase()] || ['#f1f5f9', '#475569'];
    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px 10px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                backgroundColor: bg,
                color: fg,
            }}
        >
            {params.value}
        </span>
    );
};

const CAR_VARIANCE_COLORS = {
    over: ['#fee2e2', '#b91c1c'],
    near: ['#fef3c7', '#b45309'],
    within: ['#dcfce7', '#15803d'],
    none: ['#f1f5f9', '#64748b'],
};


const CarVarianceRenderer = (params) => {
    if (params.node.rowPinned) return null;
    const variance = getCarVariance(params.data);
    const mismatch = getDistributionMismatch(params.data);
    const [bg, fg] = CAR_VARIANCE_COLORS[variance.status];
    const tooltip = `Approved CAR: ${formatCompact(variance.budgetCar)} • Actual + Forecast: ${formatCompact(variance.used)}` +
        (mismatch ? ' • Distribution across years does not match Budget 5YP' : '');
    return (
        <span title={tooltip} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '2px 10px',
                    borderRadius: '9999px',
                    fontSize: '11px',
                    fontWeight: 700,
                    backgroundColor: bg,
                    color: fg,
                }}
            >
                {variance.label}
            </span>
            {mismatch && (
                <span className="material-symbols-outlined text-[14px] text-amber-600">warning</span>
            )}
        </span>
    );
};

const HISTORY_FIELD_LABELS = {
    project_title: "Project's Title",
    note: "Note",
    status_progress: "Status",
    project_manager: "Project Manager",
    project_control: "Project Control",
    directorate: "Directorate",
    owner_area: "Owner Area",
    type_of_investment: "Type of Investment",
    category: "Category",
    risk_forecast: "Risk Forecast",
    risk_residual: "Risk Residual",
    fm_new: "FM New",
    budget_cost: "Budget Cost",
    actual_to_date: "Actual to Date",
    actual_to_date_cost: "Actual to Date (Cost)",
    budget_car: "Budget CAR",
    bc_budget: "BC Budget",
    budget_5yp: "Budget 5YP",
    budget_5yp_cost: "Budget 5YP (Cost)",
    budget_5yp_cash: "Budget 5YP (Cash)",
    forecast_cost: "Forecast Cost",
    forecast_cash: "Forecast Cash",
    start_year: "Start Year",
    num_of_year_budget: "Num. of Year Budget",
    total_cash: "Total Cash",
    total_cost: "Total Cost",
    cost_remaining: "Cost Remaining",
    cash_remaining: "Cash Remaining",
};

// Must match ProjectsController::FIND_REPLACE_FIELDS exactly — the backend
// whitelist is the actual security boundary, this just drives the dropdown.
const FIND_REPLACE_FIELDS = [
    'project_title', 'note', 'status_progress', 'project_manager', 'project_control',
    'directorate', 'owner_area', 'type_of_investment', 'category',
    'risk_residual', 'risk_forecast', 'fm_new',
];

const formatHistoryValue = (value) => {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'string' && value.trim() !== '' && !isNaN(Number(value))) {
        return Number(value).toLocaleString('en-US');
    }
    return String(value);
};

export default function Show() {
    const gridRef = useRef();
    const lastUpdatedId = useRef(null);
    const { projects, year, budgets, versions, budgetVersion, auth} = usePage().props
    const isViewer = auth.user.role === 'viewer';
    const [activeTab, setActiveTab] = useState('Tab1');
    const [versionBudgetPeriod, setVersionBudgetPeriod] = useState(budgetVersion.version);
    const [versionList, setVersionList] = useState(versions);
    const [selectedRow, setSelectedRow] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showTrendModal, setShowTrendModal] = useState(false);
    const [showFindReplace, setShowFindReplace] = useState(false);
    const [findReplaceField, setFindReplaceField] = useState('project_title');
    const [findText, setFindText] = useState('');
    const [replaceText, setReplaceText] = useState('');
    const [matchCase, setMatchCase] = useState(false);
    const [findReplaceLoading, setFindReplaceLoading] = useState(false);
    const [loading, setLoading] = useState(false);  // <-- loading state

    const pathParts = window.location.pathname.split('/');
    const startYear = parseInt(pathParts[pathParts.length - 1]) || new Date().getFullYear();
    const endYear = startYear + 4;
    const yearlyBudget = startYear + 2;
    const currentYear = new Date().getFullYear();
    const month = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const [selectedRowsState, setSelectedRowsState] = useState([]);
    const [budgetTotalYear, setBudgetTotalYear] = useState(0);
    const [loadingFinalize, setLoadingFinalize] = useState(false)
    const [isLatestVersion, setIsLatestVersion] = useState(true);
    const [isFinal, setIsFinal] = useState(budgetVersion.approval_status === 'final');
    const [deletingData, setDeletingData] = useState(false);
    const [deletingRowId, setDeletingRowId] = useState(null);
    const [deletingCount, setDeletingCount] = useState(0);
    const [kpiTotals, setKpiTotals] = useState({ fiveYpCash: 0, fiveYpCost: 0, yearCash: 0, yearCost: 0, actual: 0, actualCost: 0, remaining: 0, count: 0 });
    const [historyProject, setHistoryProject] = useState(null);
    const [historyLogs, setHistoryLogs] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
    const saveStatusTimeout = useRef(null);

    // Source of truth for user-hidden columns. columnDefs below is rebuilt
    // fresh on every render (rowData updates, tab switches, cell edits...),
    // and AG Grid re-applies each colDef's `hide` on every columnDefs prop
    // change — so a column hidden only via a live api.setColumnsVisible()
    // call (as the old code did) would silently reappear on the very next
    // unrelated re-render, not just on a full page refresh. Keeping the
    // hidden set in React state and baking it into columnDefs itself (see
    // applyPersistedHide below) makes the hide durable across re-renders,
    // matching how the tab-controlled columns already derive `hide` from
    // React state instead of one-off imperative calls.
    const [hiddenColumnsPref, setHiddenColumnsPref] = useState(() => {
        try {
            return new Set(JSON.parse(localStorage.getItem('budgetGrid.hiddenColumns') || '[]'));
        } catch (e) {
            return new Set();
        }
    });

    const openHistory = async (project) => {
        setHistoryProject(project);
        setHistoryLoading(true);
        try {
            const response = await axios.get(`/budgets/${project.id}/history`);
            setHistoryLogs(response.data.data || []);
        } catch (e) {
            setHistoryLogs([]);
        } finally {
            setHistoryLoading(false);
        }
    };

    // Summed from whatever's currently passing the grid's filters (not the
    // full dataset), so the KPI row stays truthful to what's on screen — e.g.
    // filtering the PM column narrows these totals down to that PM's projects.
    const recomputeKpiTotals = () => {
        const api = agGridRef.current?.api;
        if (!api) return;
        const totals = { fiveYpCash: 0, fiveYpCost: 0, yearCash: 0, yearCost: 0, actual: 0, actualCost: 0, remaining: 0, count: 0 };
        api.forEachNodeAfterFilter((node) => {
            if (node.data?.sap_code === 'Total') return;
            totals.fiveYpCash += parseNumber(node.data?.total_cash);
            totals.fiveYpCost += parseNumber(node.data?.total_cost);
            totals.yearCash += parseNumber(node.data?.[`cash_${startYear}`]);
            totals.yearCost += parseNumber(node.data?.[`cost_${startYear}`]);
            totals.actual += parseNumber(node.data?.actual_to_date);
            totals.actualCost += parseNumber(node.data?.actual_to_date_cost);
            totals.remaining += parseNumber(node.data?.budget_5yp);
            totals.count += 1;
        });
        setKpiTotals(totals);
    };

    useEffect(() => {
        fetchVersionList();
    }, [startYear]);

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
    }, [versionBudgetPeriod]);

    // const [rowData, setRowData] = useState([]);
    const [rowData, setRowData] = useState([]);
    useEffect(() => {
        setRowData(budgets);
    }, [budgets]);

    const toSentenceCase = (str) => {
        if (!str) return "";
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    };

    const isTab2 = activeTab === 'Tab2';
    const isTab3 = activeTab === 'Tab3';

    const generateTwoYearYearly = (year,type) => {
        month.forEach((month,index) => {
            let color = 'custom-header-green'
            if(type == 'cash') {
                color = 'custom-header-orange'
            }
            const monthField = `${type}_${index+1}_${year}`;
            columnDefs.push({
                headerName: `${toSentenceCase(type)} ${month} - ${year}`,
                field: monthField,
                filter: ExcelStyleFilter,
                filterParams: { values: rowData.map(r => r[monthField]) },
                minWidth: 170,
                hide: !isTab2,
                headerClass: color,
                comparator: numericComparator, valueFormatter: params => formatCurrency(params.value),
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

    // Money values come back from the API as strings (Laravel decimal
    // columns serialize as e.g. "9995099.00", not a JS number) — AG Grid's
    // default sort falls back to string comparison for those, which orders
    // "999,999.99" ahead of "9,436,751.00" (lexicographic, not numeric).
    // Every currency column needs this to sort correctly.
    const numericComparator = (valueA, valueB) => {
        const a = parseFloat(String(valueA ?? '0').replace(/,/g, '')) || 0;
        const b = parseFloat(String(valueB ?? '0').replace(/,/g, '')) || 0;
        return a - b;
    };

    const columnDefs = [
        { headerName: "ID", field: "id", filter: ExcelStyleFilter, filterParams: { values: rowData.map(r => r.id) }, pinned:'left', width: 40, hide:false,
            cellDataType: 'text',
            colSpan: params => params.node.rowPinned ? 3 : 1,
            cellStyle: params => params.node.rowPinned ? { textAlign: 'right', fontWeight: 700 } : null,
        },
        { headerName: "", field: "rowActions", pinned: 'right', width: 64, minWidth: 64, maxWidth: 64, flex: 0,
            sortable: false, filter: false,
            editable: false, suppressMovable: true, resizable: false,
            cellStyle: { padding: '0 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' },
            cellRenderer: (params) => {
                if (params.node.rowPinned) return null;
                const isDeletingThisRow = deletingRowId === params.data.id;
                return (
                    <>
                        <button
                            onClick={() => openHistory(params.data)}
                            title="View change history"
                            className="inline-flex items-center justify-center w-6 h-6 rounded-lg text-on-surface-variant/60 hover:bg-surface-container-high hover:text-on-surface transition-all active:scale-95"
                        >
                            <span className="material-symbols-outlined text-[15px]">history</span>
                        </button>
                        {isLatestVersion && !isFinal && !isViewer && (
                            <button
                                onClick={() => handleDelete([params.data])}
                                title="Delete this row"
                                disabled={deletingData}
                                className="inline-flex items-center justify-center w-6 h-6 rounded-lg text-error/60 hover:bg-error/10 hover:text-error transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                            >
                                {isDeletingThisRow ? (
                                    <Spinner color="text-error" size="h-4 w-4" />
                                ) : (
                                    <span className="material-symbols-outlined text-[15px]">delete</span>
                                )}
                            </button>
                        )}
                    </>
                );
            },
        },
        // minWidth (not the old width: 40) — this is the only data column with
        // headerCheckboxSelection, so its header has to fit a row-select
        // checkbox *and* the filter/pin/hide icon row in the same space.
        // 40 (even clamped up by defaultColDef's minWidth: 120) left the
        // filter icon overlapping/clipped by the checkbox, so it looked
        // unclickable — this is the one column that needs more room than the
        // shared default.
        { headerName: "SAP Code", field: "sap_code", filter: ExcelStyleFilter, filterParams: { values: rowData.map(r => r.sap_code) }, pinned:'left', minWidth: 150, checkboxSelection: true,
            headerCheckboxSelection: true},
        { headerName: "Project's Title", field: "project_title", filter: ExcelStyleFilter, filterParams: { values: rowData.map(r => r.project_title) }, pinned:'left', width: 300,
            cellEditor: AutocompleteCellEditor, cellEditorParams: { values: rowData.map(r => r.project_title) } },
        { headerName: "Note", field: "note", filter: ExcelStyleFilter, filterParams: { values: rowData.map(r => r.note) },
            cellEditor: AutocompleteCellEditor, cellEditorParams: { values: rowData.map(r => r.note) } },
        { headerName: "Status", field: "status_progress", filter: ExcelStyleFilter, filterParams: { values: rowData.map(r => r.status_progress) }, cellEditor: 'agSelectCellEditor',cellEditorParams: {
                values: ['ongoing', 'new', 'new bc'],
            }, cellRenderer: StatusBadgeRenderer },
        { headerName: "PM", field: "project_manager", filter: ExcelStyleFilter,
            filterParams: { values: rowData.map(r => r.project_manager) }, minWidth: 220,
            cellEditor: AutocompleteCellEditor, cellEditorParams: { values: rowData.map(r => r.project_manager) } },
        { headerName: "PC", field: "project_control", filter: ExcelStyleFilter, filterParams: { values: rowData.map(r => r.project_control) }, minWidth: 150,
            cellEditor: AutocompleteCellEditor, cellEditorParams: { values: rowData.map(r => r.project_control) } },
        { headerName: "Directorate", field: "directorate", filter: ExcelStyleFilter, filterParams: { values: rowData.map(r => r.directorate) }, minWidth: 75,
            cellEditor: AutocompleteCellEditor, cellEditorParams: { values: rowData.map(r => r.directorate) } },
        { headerName: "Owner Area", field: "owner_area", filter: ExcelStyleFilter, filterParams: { values: rowData.map(r => r.owner_area) }, minWidth: 200,
            cellEditor: AutocompleteCellEditor, cellEditorParams: { values: rowData.map(r => r.owner_area) } },
        { headerName: "Type of Investment", field: "type_of_investment", filter: ExcelStyleFilter, filterParams: { values: rowData.map(r => r.type_of_investment) }, minWidth:150, cellEditor: 'agSelectCellEditor',cellEditorParams: {
            values: ['True Sustaining', 'One-off'],
            } },
        { headerName: "Category", field: "category", filter: ExcelStyleFilter, filterParams: { values: rowData.map(r => r.category) }, minWidth:150, cellEditor: 'agSelectCellEditor',cellEditorParams: {
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
        { headerName: "Risk Residual", field: "risk_residual", filter: ExcelStyleFilter, filterParams: { values: rowData.map(r => r.risk_residual) }, minWidth: 50,enableCellChangeFlash: false,
            cellEditor: AutocompleteCellEditor, cellEditorParams: { values: rowData.map(r => r.risk_residual) } },
        { headerName: "Risk Forecast", field: "risk_forecast", filter: ExcelStyleFilter, filterParams: { values: rowData.map(r => r.risk_forecast) }, minWidth: 50,enableCellChangeFlash: false,
            cellEditor: AutocompleteCellEditor, cellEditorParams: { values: rowData.map(r => r.risk_forecast) } },
        { headerName: "BC Budget", field: "bc_budget", cellRenderer: "agAnimateShowChangeCellRenderer", enableCellChangeFlash: false, filter: ExcelStyleFilter, filterParams: { values: rowData.map(r => r.bc_budget) }, minWidth: 150, comparator: numericComparator, valueFormatter: params => formatCurrency(params.value) },
        { headerName: "Approved Budget", field: "budget_car", cellRenderer: "agAnimateShowChangeCellRenderer", enableCellChangeFlash: false, filter: ExcelStyleFilter, filterParams: { values: rowData.map(r => r.budget_car) }, minWidth: 150, comparator: numericComparator, valueFormatter: params => formatCurrency(params.value) },
        { headerName: "CAR Status", field: "_car_variance", enableCellChangeFlash: false, editable: false, filter: false,
            minWidth: 150, sortable: true,
            valueGetter: params => getCarVariance(params.data).pct,
            cellRenderer: CarVarianceRenderer,
        },
        {
            headerName: `Actual Up to ${currentYear - 1}`,
            children: [
                {
                    headerName: "Cost",
                    field: "actual_to_date_cost",
                    enableCellChangeFlash: false,
                    filter: ExcelStyleFilter,
                    filterParams: { values: rowData.map(r => r.actual_to_date_cost) },
                    minWidth: 150,
                    comparator: numericComparator, valueFormatter: params => formatCurrency(params.value),
                },
                {
                    headerName: "Cash",
                    field: "actual_to_date",
                    enableCellChangeFlash: false,
                    filter: ExcelStyleFilter,
                    filterParams: { values: rowData.map(r => r.actual_to_date) },
                    minWidth: 150,
                    comparator: numericComparator, valueFormatter: params => formatCurrency(params.value)
                },
            ]
        },
        {
            headerName: `A/F ${currentYear}`,
            children: [
                { headerName: "Cost", field: "forecast_cost", enableCellChangeFlash: false, filter: ExcelStyleFilter, filterParams: { values: rowData.map(r => r.forecast_cost) }, minWidth: 150, comparator: numericComparator, valueFormatter: params => formatCurrency(params.value)},
                { headerName: "Cash", field: "forecast_cash", enableCellChangeFlash: false, filter: ExcelStyleFilter, filterParams: { values: rowData.map(r => r.forecast_cash) }, minWidth: 150, comparator: numericComparator, valueFormatter: params => formatCurrency(params.value)}
            ]
        },
        {
            headerName: 'Available Budget 5YP',
            headerClass: 'custom-header-red',
            children: [
                { headerName: "Cost", field: "budget_5yp_cost", headerClass: 'custom-header-red', enableCellChangeFlash: false, filter: ExcelStyleFilter, filterParams: { values: rowData.map(r => r.budget_5yp_cost) }, minWidth: 150, comparator: numericComparator, valueFormatter: params => formatCurrency(params.value)},
                { headerName: "Cash", field: "budget_5yp", headerClass: 'custom-header-red', enableCellChangeFlash: false, filter: ExcelStyleFilter, filterParams: { values: rowData.map(r => r.budget_5yp) }, minWidth: 150, comparator: numericComparator, valueFormatter: params => formatCurrency(params.value)},
            ]
        },

       { headerName: "Start Year", field: "start_year", enableCellChangeFlash: false, filter: ExcelStyleFilter, filterParams: { values: rowData.map(r => r.start_year) } , cellEditor: 'agSelectCellEditor',cellEditorParams: () =>     {
                const values = [];
                for (let year = startYear; year <= endYear; year++) {
                    values.push(year.toString()); // Must be strings
                }
                return { values };
            } },
        { headerName: "Budget Year", field: "num_of_year_budget", filter: ExcelStyleFilter, filterParams: { values: rowData.map(r => r.num_of_year_budget) }, enableCellChangeFlash: false, minWidth: 150, cellEditor: "agSelectCellEditor",
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
        { headerName: "Fund", field: "fm_new", enableCellChangeFlash: false, filter: ExcelStyleFilter, filterParams: { values: rowData.map(r => r.fm_new) },
            cellEditor: AutocompleteCellEditor, cellEditorParams: { values: rowData.map(r => r.fm_new) } },
        { headerName: "Top",  field: "top",  filter: ExcelStyleFilter, filterParams: { values: rowData.map(r => r.top) }, minWidth:90, hide: !isTab2, cellEditor: "agSelectCellEditor", enableCellChangeFlash: false,
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
                    filter: ExcelStyleFilter,
                    filterParams: { values: rowData.map(r => r[`total_cost_${year}`]) },
                    minWidth: 170,
                    headerClass: 'custom-header-green',
                    editable:false,
                    enableCellChangeFlash: false,
                    hide: !isTab2,
                    comparator: numericComparator, valueFormatter: params => formatCurrency(params.value),
                }
            )
        }
        let hide = activeTab === 'Tab1' || (activeTab == 'Tab2' && year < yearlyBudget) ? false : true

        columnDefs.push(
        {
            headerName: `Cost - ${year}`,
            field: `cost_${year}`,
            filter: ExcelStyleFilter,
            filterParams: { values: rowData.map(r => r[`cost_${year}`]) },
            minWidth: 150,
            hide: hide,
            enableCellChangeFlash: false,
            headerClass:'custom-header-green-group',
            comparator: numericComparator, valueFormatter: params => formatCurrency(params.value)
        }
        );

        if(year < yearlyBudget){
            columnDefs.push(
                {
                    headerName: `Cost - ${year} - Remaining`,
                    field: `cost_${year}_remaining`,
                    filter: ExcelStyleFilter,
                    filterParams: { values: rowData.map(r => r[`cost_${year}_remaining`]) },
                    minWidth: 220,
                    hide: !isTab2,
                    headerClass:'custom-header-green-2',
                    enableCellChangeFlash: false,
                    comparator: numericComparator, valueFormatter: params => formatCurrency(params.value),
                    cellClassRules: {
                        'negative-value': params => params.value < 0,
                        'positive-value': params => params.value >= 0
                    }
                }
            )
        }
    }

    columnDefs.push({
            headerName: `Cost ${startYear}-${endYear}`,
            field: `total_cost`,
            filter: ExcelStyleFilter,
            filterParams: { values: rowData.map(r => r.total_cost) },
            minWidth: 150,
            editable:false,
            enableCellChangeFlash: false,
            // The 5-year sum is the figure that matters most in this block,
            // so it gets called out instead of blending into the per-year columns.
            headerClass:'custom-header-green-group',
            cellClass: 'cell-dark-green',
            hide: activeTab === 'Tab1' ? false : true,
            comparator: numericComparator, valueFormatter: params => formatCurrency(params.value)
        },
        {
            headerName: "Cost Remaining",
            field: 'cost_remaining',
            filter: ExcelStyleFilter,
            filterParams: { values: rowData.map(r => r.cost_remaining) },
            minWidth: 150,
            editable: false,
            headerClass:'custom-header-green',
            // Base tint matches the rest of the Cost columns; cellClassRules
            // below still wins (its colors are !important) when the value is
            // negative, so the over-budget red warning is never hidden by this.
            cellClass: 'total-cell-green',
            enableCellChangeFlash: false,
            hide: activeTab === 'Tab1' ? false : true,
            comparator: numericComparator, valueFormatter: params => formatCurrency(params.value),
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
                    filter: ExcelStyleFilter,
                    filterParams: { values: rowData.map(r => r[`total_cash_${year}`]) },
                    minWidth: 170,
                    headerClass: 'custom-header-orange',
                    editable:false,
                    enableCellChangeFlash: false,
                    hide: !isTab2,
                    comparator: numericComparator, valueFormatter: params => formatCurrency(params.value),
                }
            )
        }
        let hide = activeTab === 'Tab1' || (activeTab == 'Tab2' && year < yearlyBudget) ? false : true
        columnDefs.push({
            headerName: `Cash - ${year}`,
            field: `cash_${year}`,
            filter: ExcelStyleFilter,
            filterParams: { values: rowData.map(r => r[`cash_${year}`]) },
            minWidth: 150,
            enableCellChangeFlash: false,
            headerClass:'custom-header-orange-group',
            comparator: numericComparator, valueFormatter: params => formatCurrency(params.value),
            hide: hide,
        });

        if(year < yearlyBudget){
            columnDefs.push(
                {
                    headerName: `Cash - ${year} - Remaining`,
                    field: `cash_${year}_remaining`,
                    filter: ExcelStyleFilter,
                    filterParams: { values: rowData.map(r => r[`cash_${year}_remaining`]) },
                    minWidth: 220,
                    enableCellChangeFlash: false,
                    hide: !isTab2,
                    headerClass:'custom-header-orange-2',
                    comparator: numericComparator, valueFormatter: params => formatCurrency(params.value),
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
            headerName: `Cash ${startYear}-${endYear}`,
            field: `total_cash`,
            filter: ExcelStyleFilter,
            filterParams: { values: rowData.map(r => r.total_cash) },
            minWidth: 150,
            editable:false,
            enableCellChangeFlash: false,
            headerClass:'custom-header-orange-group',
            cellClass: 'cell-dark-orange',
            hide: activeTab === 'Tab1' ? false : true,
            comparator: numericComparator, valueFormatter: params => formatCurrency(params.value)
        },
        {
            headerName: "Cash Remaining",
            field: 'cash_remaining',
            filter: ExcelStyleFilter,
            filterParams: { values: rowData.map(r => r.cash_remaining) },
            minWidth: 150,
            editable:false,
            enableCellChangeFlash: false,
            headerClass:'custom-header-orange',
            // See Cost Remaining above — base tint matches the Cash columns,
            // cellClassRules below still wins for negative values.
            cellClass: 'total-cell-orange',
            hide: activeTab === 'Tab1' ? false : true,
            comparator: numericComparator, valueFormatter: params => formatCurrency(params.value),
            cellClassRules: {
                'negative-value': params => params.value < 0,
                'positive-value': params => params.value >= 0
            }
        }
    )

    for (let year = startYear - 1; year <= startYear; year++) {
        columnDefs.push({
            headerName: `Commitment - ${year}`,
            field: `commitment_${year}`,
            filter: ExcelStyleFilter,
            filterParams: { values: rowData.map(r => r[`commitment_${year}`]) },
            minWidth: 150,
            enableCellChangeFlash: false,
            headerClass: 'custom-header-blue',
            comparator: numericComparator, valueFormatter: params => formatCurrency(params.value),
            hide: activeTab === 'Tab1' ? false : true,
        });
    }

    // Bakes the persisted hide preference into columnDefs itself (see
    // hiddenColumnsPref above) rather than relying on a one-off imperative
    // api.setColumnsVisible() call, so it survives every re-render, not just
    // the initial mount. Tab-controlled columns are left untouched — their
    // `hide` already correctly comes from activeTab above.
    const applyPersistedHide = (defs) => {
        defs.forEach(def => {
            if (Array.isArray(def.children)) {
                applyPersistedHide(def.children);
            } else if (def.field && !TAB_CONTROLLED_FIELD.test(def.field) && hiddenColumnsPref.has(def.field)) {
                def.hide = true;
            }
        });
        return defs;
    };
    applyPersistedHide(columnDefs);

    const defaultColDef = {
        resizable: true,
        sortable: true,
        filter: ExcelStyleFilter,
        flex: 1,
        minWidth: 120,
        editable: true,
        headerComponent: PinnableHeader,
        wrapHeaderText: true,
        autoHeaderHeight: true,
    }
    const formatCurrency = (value) => {
        if (value == null || isNaN(value)) return '';
        return Number(value).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    const formatCompactCurrency = (value) => {
        const num = Number(value) || 0;
        const sign = num < 0 ? '-' : '';
        const abs = Math.abs(num);
        if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`;
        if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
        if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
        return `${sign}$${abs.toFixed(0)}`;
    };

    const handleImport = async (data) => {
        setLoading(true);
        const buildFormData = (dryRun) => {
            const formData = new FormData();
            formData.append("file", data.file)
            formData.append("year", data.year)
            formData.append("version", versionBudgetPeriod)
            if (dryRun) formData.append("dry_run", "1");
            return formData;
        };

        let preview;
        try {
            const previewResponse = await axios.post('/budgets/import-project', buildFormData(true), {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            preview = previewResponse.data;
        } catch (error) {
            setLoading(false);
            Swal.fire({
                icon: 'error',
                title: 'Upload Failed',
                text: error.response?.data?.message || 'Something went wrong',
            });
            return;
        }

        const warningText = preview.deleted > 0
            ? `${preview.updated} project(s) will be updated. ${preview.deleted} project(s) whose SAP Code is not in this file will be PERMANENTLY DELETED — including "${(preview.deleted_titles || []).slice(0, 3).join('", "')}"${preview.deleted > 3 ? ', and more' : ''}. This cannot be undone!`
            : `${preview.updated} project(s) will be updated. No existing projects will be deleted.`;

        const result = await Swal.fire({
            title: 'Replace data in this version?',
            text: warningText,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: preview.deleted > 0 ? `Yes, delete ${preview.deleted} and import` : 'Yes, import',
            cancelButtonText: 'Cancel'
        });

        if (!result.isConfirmed) {
            setLoading(false);
            return;
        }

        try {
            const response = await axios.post('/budgets/import-project', buildFormData(false), {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })

            const budgetByVersion = await getBudgetByVersion(versionBudgetPeriod);
            setRowData(budgetByVersion.data.budgets);

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
        try {
            setLoading(true);

            const response = await axios.post(
                '/export/budgets',
                { year: startYear },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    },
                    responseType: 'blob', // Important for binary data
                }
            );

            // Create Blob and download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `budget-cycle-${startYear}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Failed to export", error);
        } finally {
            setLoading(false);
        }
    };

    // Excel-style Find & Replace across one text column, scoped to the
    // version currently open. Same dry-run-then-confirm shape as
    // handleImport() above: preview the count before committing, since a
    // careless "replace all" can silently touch far more rows than intended.
    const handleFindReplace = async () => {
        if (!findText) return;
        setFindReplaceLoading(true);
        const payload = {
            year: startYear,
            version: versionBudgetPeriod,
            field: findReplaceField,
            find: findText,
            replace: replaceText,
            match_case: matchCase,
        };

        let preview;
        try {
            const previewResponse = await axios.post('/budgets/find-replace', { ...payload, dry_run: 1 });
            preview = previewResponse.data;
        } catch (error) {
            setFindReplaceLoading(false);
            Swal.fire({ icon: 'error', title: 'Find & Replace Failed', text: error.response?.data?.message || 'Something went wrong' });
            return;
        }

        if (preview.count === 0) {
            setFindReplaceLoading(false);
            Swal.fire({ icon: 'info', title: 'No matches', text: `No "${findReplaceField}" values contain "${findText}".`, timer: 2000, showConfirmButton: false });
            return;
        }

        const examples = (preview.preview || [])
            .map((row) => `${row.sap_code || row.project_title}: "${row.before}" → "${row.after}"`)
            .join('\n');

        const result = await Swal.fire({
            title: `Replace ${preview.count} value(s)?`,
            html: `<div style="text-align:left;white-space:pre-wrap;max-height:200px;overflow-y:auto;font-size:12px;">${examples}${preview.count > 10 ? `\n…and ${preview.count - 10} more` : ''}</div>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: `Yes, replace ${preview.count}`,
        });

        if (!result.isConfirmed) {
            setFindReplaceLoading(false);
            return;
        }

        try {
            const response = await axios.post('/budgets/find-replace', payload);
            const budgetByVersion = await getBudgetByVersion(versionBudgetPeriod);
            setRowData(budgetByVersion.data.budgets);
            Swal.fire({ icon: 'success', title: 'Done', text: response.data.message, timer: 2000, showConfirmButton: false });
            setShowFindReplace(false);
            setFindText('');
            setReplaceText('');
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Find & Replace Failed', text: error.response?.data?.message || 'Something went wrong' });
        } finally {
            setFindReplaceLoading(false);
        }
    };

    const getBudgetByVersion = async (version) => {
        const response = await axios({
            method: 'get',
            url: `/budgets-version/${startYear}/${version}`,
            data:{
                version: version
            },
            headers: {
                'Accept': 'application/json'
            }
        })

        return response
    }
    const handleChangeVersion = async (e) => {
        setLoading(true)
        setVersionBudgetPeriod(e.target.value)
        const response = await getBudgetByVersion(e.target.value)

        if(response.status === 200) {
            setRowData(response.data.budgets);
            setLoading(false)
            setIsLatestVersion(e.target.value == response.data.latestVersion);
            setIsFinal(response.data.approvalStatus === 'final');
        } else {
            Swal.fire('Error', response.message, 'warning');
            setLoading(false)
        }

    }

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

        newRow[`commitment_${startYear - 1}`] = 0;

        for (let year = startYear; year <= endYear; year++) {
            newRow[`cost_${year}`] = 0;
            newRow[`cash_${year}`] = 0;
            if (year === startYear) {
                newRow[`commitment_${year}`] = 0;
            }
            newRow[`cost_${year}_remaining`] = 0;
            newRow[`cash_${year}_remaining`] = 0;

            for (let i = 1; i <= 12; i++) {
                newRow[`cost_${i}_${year}`] = 0;
                newRow[`cash_${i}_${year}`] = 0;
            }
        }

        setRowData(prev => [newRow, ...prev]);
    };

    const handleDuplicateRow = async () => {
        const duplicatedRows = selectedRowsState.map(row => ({
            ...row,
            sap_code: 'COPY_' + (row['sap_code'] ? row['sap_code'] : 'XXXXX'),
            year: startYear,
        }));

        if (duplicatedRows.length < 1) {
            return false;
        }

        try {
            const response = await axios.post('/budgets/duplicate', duplicatedRows, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            agGridRef.current.api.applyTransaction({ add: response.data.data, addIndex: 0 });
        } catch (error) {
            console.error("Failed to duplicate budget record:", error);
            alert("An error occurred while duplicating the data. Please try again.");
        }
    };
    const onSelectionChanged = () => {
        const api = agGridRef.current.api;

        // The legacy header "select all" checkbox (needed here so the checkbox
        // stays embedded in the SAP Code column, not AG Grid's newer auto-injected
        // selection column) selects every row in the dataset by default, ignoring
        // the active filter — this caused a real mass-delete incident. Correct it:
        // anything selected that isn't currently passing the filter gets dropped.
        const filteredIds = new Set();
        api.forEachNodeAfterFilter((node) => filteredIds.add(node.id));
        const overSelectedNodes = api.getSelectedNodes().filter((node) => !filteredIds.has(node.id));
        if (overSelectedNodes.length > 0) {
            api.setNodesSelected({ nodes: overSelectedNodes, newValue: false });
            return;
        }

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
            id: 'Total (USD)',
            sap_code: 'Total',
            title: '',
            total_cash:0,
            total_cost:0
        };
        totals[`commitment_${startYear - 1}`] = 0;
        for(let i = startYear; i< endYear + 1; i++){
            const cashField = `cash_${i}`;
            const costField = `cost_${i}`;
            totals[cashField] = 0;
            totals[costField] = 0;
            if (i === startYear) {
                totals[`commitment_${i}`] = 0;
            }
        }

        const arrayData = Array.isArray(rowData)
            ? rowData
            : Object.keys(rowData)
                .filter(key => !isNaN(key)) // only numeric keys
                .map(key => rowData[key]);

        arrayData.forEach(row => {
            totals[`commitment_${startYear - 1}`] += parseNumber(row[`commitment_${startYear - 1}`]);
            for (let i = startYear; i <= endYear; i++) {
                const cashField = `cash_${i}`;
                const costField = `cost_${i}`;
                totals[cashField] += parseNumber(row[cashField]);
                totals[costField] += parseNumber(row[costField]);
                if (i === startYear) {
                    totals[`commitment_${i}`] += parseNumber(row[`commitment_${i}`]);
                }
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
            totals[`commitment_${startYear - 1}`] = 0;
            for (let year = startYear; year <= endYear + 1; year++) {
                totals[`cash_${year}`] = 0;
                totals[`cost_${year}`] = 0;
                if (year === startYear) {
                    totals[`commitment_${year}`] = 0;
                }
            }

            // Sum values dynamically
            api.forEachNode((node) => {
                const row = node.data;
                if (row.sap_code === 'Total') return; // Skip total row

                totals[`commitment_${startYear - 1}`] += parseNumber(row[`commitment_${startYear - 1}`]);
                for (let year = startYear; year <= endYear; year++) {
                    totals[`cash_${year}`] += parseNumber(row[`cash_${year}`]);
                    totals[`cost_${year}`] += parseNumber(row[`cost_${year}`]);
                    if (year === startYear) {
                        totals[`commitment_${year}`] += parseNumber(row[`commitment_${year}`]);
                    }
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
            Object.assign(data, distributeAnnualBudget(data, startYear, endYear));

            const years = data['num_of_year_budget'];
            const budgetPerYear = data['budget_5yp'] > 0 ? data['budget_5yp'] / years : 0;
            for (let year = startYear; year <= endYear; year++) {
                budgetDistributeMonthly(budgetPerYear, year)
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

        const defineBudget5YP = () => {
            Object.assign(data, computeBudget5YP(data));

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

        if (/^commitment_\d{4}$/.test(colDef.field)) {
            updateTotalYearlyCostCash();
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
            calculateTotalBudget(api)

        }

        if(/^cash_(1[0-2]|[1-9])_\d{4}$/.test(colDef.field)) {
            updateCostMonthlyRemaining(data, colDef)
            updateTotalMonthly('cash',colDef.field.split("_")[2])
            calculateTotalBudget(api)
        }

        if (colDef.field === 'budget_5yp' || colDef.field === 'budget_5yp_cost' || colDef.field === 'num_of_year_budget' || colDef.field === 'start_year') {
            budgetDistribute(data);
            calculateTotalBudget(api)
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

            // Guardrail: warn (don't block) when this forecast would exceed
            // the approved CAR — same underlying condition the "CAR Status"
            // badge shows, but surfaced immediately at the moment of edit
            // rather than only passively on the next render.
            const remainingCash = toNum(data.budget_5yp);
            const remainingCost = toNum(data.budget_5yp_cost);
            if (remainingCash < 0 || remainingCost < 0) {
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'warning',
                    title: 'Forecast exceeds approved CAR',
                    text: `${data.project_title || 'This project'} is over CAR by ${formatCompact(Math.min(remainingCash, remainingCost))}`,
                    showConfirmButton: false,
                    timer: 4000,
                    timerProgressBar: true,
                });
            }
        }

        if (/^cash_\d{4}$/.test(colDef.field) || ['budget_5yp', 'num_of_year_budget', 'start_year'].includes(colDef.field)) {
            if (getDistributionMismatch(data)) {
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'warning',
                    title: 'Distribution mismatch',
                    text: `Yearly cash split for ${data.project_title || 'this project'} no longer sums to Budget 5YP.`,
                    showConfirmButton: false,
                    timer: 4000,
                    timerProgressBar: true,
                });
            }
        }

        clearTimeout(saveStatusTimeout.current);
        setSaveStatus('saving');
        try {
            const isNew = !data.id; // if no ID, it's new
            data['year_period'] = startYear
            const url = isNew ? '/budgets' : `/budgets/${data.id}`;
            const method = isNew ? 'post' : 'put';

            const response = await axios({
                method: method,
                url: url,
                data: data, // axios will handle JSON automatically
                headers: {
                    'Accept': 'application/json'
                }
            });

            const result = response.data;
            if (!result.success) {
                console.error("Failed to update budget record:", result);
                alert(result.message || "An error occurred while updating the data. Please try again.");
                setSaveStatus('error');
                return;
            }

            if (isNew && result.data?.id) {
                agGridRef.current.api.applyTransaction({ remove: [params.data] });
                const newRow = { ...data, id: result.data.id };
                lastUpdatedId.current = newRow.id;
                agGridRef.current.api.applyTransaction({ add: [newRow], addIndex: 0 });
            } else {
                lastUpdatedId.current = data.id;
            }

            console.log(result.message);
            recomputeKpiTotals();
            setSaveStatus('saved');
            saveStatusTimeout.current = setTimeout(() => setSaveStatus('idle'), 2500);
        } catch (error) {
            console.error("Update error:", error);
            setSaveStatus('error');
        }
    };

    const handleViewTrend = () => {
        if (!selectedRowsState || selectedRowsState.length !== 1) {
            Swal.fire('Select one project', 'Select exactly one row (checkbox) to view its 5-year trend.', 'info');
            return;
        }
        setShowTrendModal(true);
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

    // Jumps from an ExceptionList row (Forecasts tab) back to the editable
    // grid, scrolled and flashed on that exact row, instead of leaving the
    // user to hunt for it again across the full column set.
    const handleSelectExceptionProject = (project) => {
        setActiveTab('Tab1');
        setTimeout(() => {
            const api = agGridRef.current?.api;
            if (!api) return;
            const node = api.getRowNode(project.id);
            if (node) {
                api.ensureNodeVisible(node, 'middle');
                api.flashCells({ rowNodes: [node] });
            }
        }, 100);
    };

    // Bulk "Delete Data" (Actions dropdown) omits rowsOverride and falls back
    // to the checkbox selection; the per-row trash-icon button passes its own
    // single row directly so it doesn't disturb whatever's currently checked.
    const handleDelete = async (rowsOverride) => {
        const rows = rowsOverride || selectedRowsState;

        if (!rows || rows.length === 0) {
            Swal.fire('No rows selected', 'Please select at least one row to delete.', 'warning');
            return;
        }

        const result = await Swal.fire({
            title: 'Are you sure?',
            text: rows.length === 1
                ? `Delete project "${rows[0].project_title || rows[0].sap_code || rows[0].id}"? This cannot be undone!`
                : `This action will permanently delete ${rows.length} selected budgets!`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete!',
            cancelButtonText: 'Cancel'
        });

        if (!result.isConfirmed) return;

        let selectedRows = rows.map(row => ({
            ...row
        }));

        const ids = selectedRows.map(row => row.id);
        const query = ids.map(id => `ids[]=${id}`).join('&');

        setDeletingData(true);
        setDeletingCount(rows.length);
        if (rowsOverride && rowsOverride.length === 1) setDeletingRowId(rowsOverride[0].id);
        try {
            const response = await axios.delete(`/budgets?${query}&year=${startYear}`, {
                headers: {
                     'Accept': 'application/json'
                }
            });

            setRowData(prevData =>
                prevData.filter(row => !ids.includes(row.id))
            );
            // Also remove directly via the grid API: rows created via the "+"
            // button get their placeholder id swapped for a real one through
            // an applyTransaction call (not setRowData), so they can be absent
            // from `rowData` state entirely — filtering state alone wouldn't
            // touch them on screen.
            agGridRef.current?.api?.applyTransaction({ remove: selectedRows });

            if (!rowsOverride) setSelectedRowsState([]);
            Swal.fire({
                icon: 'success',
                title: 'Deleted',
                text: response.data?.message || 'Selected budgets deleted.',
                timer: 2000,
                showConfirmButton: false,
            });
        } catch (error) {
            console.error('Error deleting:', error);
            const message = error.response?.data?.message || 'An unexpected error occurred while deleting.';
            const lockedIds = error.response?.data?.locked_ids || [];
            const lockedSapCodes = selectedRows
                .filter(row => lockedIds.includes(row.id))
                .map(row => row.sap_code || row.id);
            Swal.fire('Delete failed', lockedSapCodes.length ? `${message} (SAP Code: ${lockedSapCodes.join(', ')})` : message, 'error');
        } finally {
            setDeletingData(false);
            setDeletingRowId(null);
            setDeletingCount(0);
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

        console.log(versionBudgetPeriod)
        if (!result.isConfirmed) return;
        setLoadingFinalize(true)
        try {
            const response = await axios({
                method: 'put',
                url: `/budgets-finalize/${startYear}/${versionBudgetPeriod}`,
                data: {}, // axios will handle JSON automatically
                headers: {
                    'Accept': 'application/json'
                }
            });

            if(response.status === 200){
                await fetchVersionList();
                setVersionBudgetPeriod(prev => prev + 1);
                const budgetByVersion = await getBudgetByVersion(versionBudgetPeriod + 1)
                setRowData(budgetByVersion.data.budgets)
                setIsFinal(false);
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

            setLoadingFinalize(false)

        } catch (e) {
            console.error('Error finalize:', e);
            Swal.fire('Error', e.response?.data?.message || 'An unexpected error occurred.', 'error');
            setLoadingFinalize(false)
        }

    }

    const handleLock = async () => {
        const result = await Swal.fire({
            title: 'Lock & Approve this version?',
            text: 'This permanently locks this budget cycle version as Final and Approved. It can never be edited or unlocked again.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, Lock & Approve!',
            cancelButtonText: 'Cancel'
        });

        if (!result.isConfirmed) return;
        setLoadingFinalize(true)
        try {
            const response = await axios({
                method: 'put',
                url: `/budgets-lock/${startYear}/${versionBudgetPeriod}`,
                data: {},
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (response.status === 200) {
                setIsFinal(true);
                Swal.fire({
                    icon: 'success',
                    title: 'Locked & Approved',
                    text: response.data.message,
                    timer: 2000,
                    showConfirmButton: false,
                });
            }
        } catch (e) {
            console.error('Error locking:', e);
            Swal.fire('Error', e.response?.data?.message || 'An unexpected error occurred.', 'error');
        } finally {
            setLoadingFinalize(false)
        }
    }

    const handleDeleteVersion = async () => {
        if (versionList.length <= 1) {
            Swal.fire('Cannot delete', 'This is the only version for this budget cycle.', 'warning');
            return;
        }

        const result = await Swal.fire({
            title: `Delete version ${versionBudgetPeriod}?`,
            text: 'This permanently deletes ALL projects, budgets, and cash/cost data belonging to this version. This cannot be undone!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete this version!',
            cancelButtonText: 'Cancel'
        });

        if (!result.isConfirmed) return;

        setLoading(true);
        try {
            const response = await axios.delete(`/budgets-version/${startYear}/${versionBudgetPeriod}`, {
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (response.status === 200) {
                await fetchVersionList();
                const nextVersion = response.data.latestVersion;
                setVersionBudgetPeriod(nextVersion);
                const budgetByVersion = await getBudgetByVersion(nextVersion);
                setRowData(budgetByVersion.data.budgets);
                setIsLatestVersion(true);
                setIsFinal(budgetByVersion.data.approvalStatus === 'final');
                Swal.fire({
                    icon: 'success',
                    title: 'Version deleted',
                    timer: 2000,
                    showConfirmButton: false,
                });
            }
        } catch (e) {
            console.error('Error deleting version:', e);
            Swal.fire('Error', e.response?.data?.message || 'An unexpected error occurred.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchVersionList = async () => {
        try {
            const response = await axios.get(`/budgets-versions/${startYear}`);
            setVersionList(response.data.data);
        } catch (e) {
            console.error("Error fetching version list:", e);
        }
    };

    const agGridRef = useRef(); // <--- Add this

    // Filters are also meant to feel "permanent" across refreshes, mirrored
    // to localStorage. Unlike column hide (baked into columnDefs above), the
    // filter model isn't a colDef property — AG Grid keeps it in its own
    // FilterManager state, which does survive columnDefs re-renders on its
    // own, so a plain restore-on-ready + persist-on-change is sufficient here.
    const FILTER_MODEL_STORAGE_KEY = 'budgetGrid.filterModel';

    const onGridReady = (params) => {
        try {
            const savedFilterModel = JSON.parse(localStorage.getItem(FILTER_MODEL_STORAGE_KEY) || 'null');
            if (savedFilterModel) params.api.setFilterModel(savedFilterModel);
        } catch (e) {
            console.error('Failed to restore saved filter model:', e);
        }
    };

    // Fired for ANY visibility change (the header's own hide button, the
    // Columns panel checkboxes, or its Select All) — single choke point that
    // syncs the live grid state back into hiddenColumnsPref + localStorage.
    const onColumnVisibleForStorage = () => {
        const api = agGridRef.current?.api;
        if (!api) return;
        const hidden = new Set();
        api.getColumns()?.forEach(col => {
            const field = col.getColId();
            if (!col.isVisible() && !TAB_CONTROLLED_FIELD.test(field)) hidden.add(field);
        });
        localStorage.setItem('budgetGrid.hiddenColumns', JSON.stringify([...hidden]));
        setHiddenColumnsPref(hidden);
    };

    const onFilterChangedCombined = (params) => {
        recomputeKpiTotals();
        try {
            localStorage.setItem(FILTER_MODEL_STORAGE_KEY, JSON.stringify(params.api.getFilterModel()));
        } catch (e) {
            console.error('Failed to persist filter model:', e);
        }
    };

    return (
        <AuthenticatedLayout>
            <div className="flex flex-col gap-stack-md">

                <nav className="flex items-center gap-2 text-on-surface-variant" aria-label="Breadcrumb">
                    <Link href={'/dashboard'} className="font-body-sm text-body-sm hover:text-primary transition-colors">
                        Dashboard
                    </Link>
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    <Link href={'/budgets'} className="font-body-sm text-body-sm hover:text-primary transition-colors">
                        Budgets
                    </Link>
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    <span className="font-body-sm text-body-sm font-bold text-primary">{startYear} - {endYear}</span>
                </nav>

                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-stack-md">
                    <div className="flex items-center gap-stack-md flex-wrap">
                        <h2 className="font-headline-lg text-3xl font-bold text-on-surface tracking-tight">Budget Overview</h2>

                        {saveStatus !== 'idle' && (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                                saveStatus === 'saving' ? 'bg-surface-container-high text-on-surface-variant' :
                                saveStatus === 'saved' ? 'bg-tertiary-container/20 text-tertiary' :
                                'bg-error-container text-error'
                            }`}>
                                {saveStatus === 'saving' && (
                                    <>
                                        <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                                        Saving…
                                    </>
                                )}
                                {saveStatus === 'saved' && (
                                    <>
                                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                        Saved
                                    </>
                                )}
                                {saveStatus === 'error' && (
                                    <>
                                        <span className="material-symbols-outlined text-[14px]">error</span>
                                        Save failed
                                    </>
                                )}
                            </span>
                        )}

                        {/* Version control — clean select pill; Compare is a normal secondary
                            button beside it. Delete Version (destructive, rare) moved into the
                            Actions dropdown instead of sitting right next to the version picker
                            where it was one misclick away. */}
                        <div className="flex items-center gap-2">
                            <span className="font-label-caps text-label-caps text-on-surface-variant opacity-70">Version</span>
                            <div className="relative">
                                <select
                                    className="appearance-none bg-surface border border-outline-variant rounded-lg pl-3 pr-8 py-1.5 font-bold text-on-surface text-sm shadow-sm focus:ring-1 focus:ring-primary outline-none cursor-pointer"
                                    value={versionBudgetPeriod}
                                    onChange={handleChangeVersion}
                                >
                                    {versionList.map((version) => (
                                        <option key={version} value={version}>
                                            {version}
                                        </option>
                                    ))}
                                </select>
                                <span className="material-symbols-outlined text-[18px] absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
                                    expand_more
                                </span>
                            </div>
                            {versionList.length > 1 && (
                                <Link
                                    href={`/budgets/${startYear}/compare`}
                                    title="Compare two versions of this budget cycle"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-outline-variant bg-surface text-on-surface-variant rounded-lg font-label-caps text-label-caps hover:bg-surface-container hover:text-primary transition-all active:scale-95 shadow-sm"
                                >
                                    <span className="material-symbols-outlined text-[16px]">compare_arrows</span>
                                    Compare
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-stack-sm">
                        {!isTab3 && (
                            <ColumnVisibilityPanel api={agGridRef.current?.api} columnDefs={columnDefs} />
                        )}
                        <Dropdown>
                            <Dropdown.Trigger>
                                <button className="inline-flex items-center gap-2 px-stack-md py-2 border border-outline-variant bg-surface text-on-surface-variant rounded-lg font-label-caps text-label-caps hover:bg-surface-container transition-all active:scale-95 shadow-sm">
                                    <span className="material-symbols-outlined text-[18px]">more_vert</span>
                                    Actions
                                </button>
                            </Dropdown.Trigger>
                            <Dropdown.Content align="right" width="64" contentClasses="py-1.5 bg-white w-64">
                                {!isViewer && (
                                    <button
                                        onClick={() => setShowModal(true)}
                                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container text-left"
                                    >
                                        <span className="material-symbols-outlined text-[18px] opacity-70">upload</span>
                                        Import Data
                                    </button>
                                )}
                                {!isViewer && (
                                    <button
                                        onClick={() => setShowFindReplace(true)}
                                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container text-left"
                                    >
                                        <span className="material-symbols-outlined text-[18px] opacity-70">find_replace</span>
                                        Find &amp; Replace
                                    </button>
                                )}
                                {!isViewer && (
                                    <button
                                        onClick={handleExport}
                                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container text-left"
                                    >
                                        {loading ? (
                                            <>
                                                <Spinner color="text-primary"/>
                                                <span>Export Data...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined text-[18px] opacity-70">download</span>
                                                Export Data
                                            </>
                                        )}
                                    </button>
                                )}
                                {!isViewer && (
                                    <button
                                        onClick={handleDuplicateRow}
                                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-secondary hover:bg-surface-container text-left"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">content_copy</span>
                                        Duplicate
                                    </button>
                                )}
                                <button
                                    onClick={handleViewTrend}
                                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-tertiary-container hover:bg-surface-container text-left"
                                >
                                    <span className="material-symbols-outlined text-[18px]">show_chart</span>
                                    View Trend
                                </button>
                                {!isViewer && (
                                    <>
                                        <div className="my-1 border-t border-outline-variant"></div>
                                        <button
                                            onClick={() => handleDelete()}
                                            disabled={deletingData}
                                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-error hover:bg-error/10 text-left disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            {deletingData ? (
                                                <>
                                                    <Spinner color="text-error"/>
                                                    <span>Deleting...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                    Delete Data
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={handleDeleteVersion}
                                            disabled={versionList.length <= 1}
                                            title={versionList.length <= 1 ? 'This is the only version for this budget cycle' : undefined}
                                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-error hover:bg-error/10 text-left disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">delete_forever</span>
                                            Delete This Version
                                        </button>
                                    </>
                                )}
                            </Dropdown.Content>
                        </Dropdown>

                        {isFinal ? (
                            <span className="inline-flex items-center gap-2 px-stack-md py-2 bg-secondary-container text-on-secondary-container rounded-lg font-label-caps text-label-caps">
                                <span className="material-symbols-outlined text-[18px]">lock</span>
                                Final &amp; Approved
                            </span>
                        ) : !isViewer && (
                            <>
                                <button
                                    onClick={handleLock}
                                    disabled={!isLatestVersion}
                                    className="inline-flex items-center gap-2 px-stack-md py-2 border border-outline-variant bg-surface text-on-surface-variant rounded-lg font-label-caps text-label-caps hover:bg-surface-container transition-all active:scale-95 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <span className="material-symbols-outlined text-[18px]">lock</span>
                                    Lock &amp; Approve
                                </button>
                                <button
                                    onClick={handleFinalize}
                                    disabled={!isLatestVersion}
                                    className="inline-flex items-center gap-2 px-stack-md py-2 bg-primary text-on-primary rounded-lg font-label-caps text-label-caps hover:brightness-110 transition-all active:scale-95 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <span className="material-symbols-outlined text-[18px]">task_alt</span>
                                    Finalize Cycle
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* KPI summary — reflects whatever is currently passing the grid's filters */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-stack-sm">
                    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-2.5 flex items-center gap-2.5 hover:shadow-md transition-shadow">
                        <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-on-primary-container text-[16px]">account_balance_wallet</span>
                        </div>
                        <div className="min-w-0">
                            <p className="font-label-caps text-label-caps text-on-surface-variant truncate">Total 5YP Budget {startYear}-{endYear}</p>
                            <p className="text-lg font-semibold text-on-surface truncate" title={`Cash: ${formatCurrency(kpiTotals.fiveYpCash)}`}>
                                {formatCompactCurrency(kpiTotals.fiveYpCash)}
                                <span className="text-body-sm font-normal text-on-surface-variant"> Cash</span>
                            </p>
                            <p className="font-body-sm text-body-sm text-on-surface-variant truncate" title={`Cost: ${formatCurrency(kpiTotals.fiveYpCost)}`}>
                                {formatCompactCurrency(kpiTotals.fiveYpCost)} Cost
                            </p>
                        </div>
                    </div>

                    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-2.5 flex items-center gap-2.5 hover:shadow-md transition-shadow">
                        <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-on-primary-container text-[16px]">calendar_month</span>
                        </div>
                        <div className="min-w-0">
                            <p className="font-label-caps text-label-caps text-on-surface-variant truncate">Total Budget {startYear}</p>
                            <p className="text-lg font-semibold text-on-surface truncate" title={`Cash: ${formatCurrency(kpiTotals.yearCash)}`}>
                                {formatCompactCurrency(kpiTotals.yearCash)}
                                <span className="text-body-sm font-normal text-on-surface-variant"> Cash</span>
                            </p>
                            <p className="font-body-sm text-body-sm text-on-surface-variant truncate" title={`Cost: ${formatCurrency(kpiTotals.yearCost)}`}>
                                {formatCompactCurrency(kpiTotals.yearCost)} Cost
                            </p>
                        </div>
                    </div>

                    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-2.5 flex items-center gap-2.5 hover:shadow-md transition-shadow">
                        <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-on-secondary-container text-[16px]">history</span>
                        </div>
                        <div className="min-w-0">
                            <p className="font-label-caps text-label-caps text-on-surface-variant truncate">Actual to Date</p>
                            <p className="text-lg font-semibold text-on-surface truncate" title={`Cash: ${formatCurrency(kpiTotals.actual)}`}>
                                {formatCompactCurrency(kpiTotals.actual)}
                                <span className="text-body-sm font-normal text-on-surface-variant"> Cash</span>
                            </p>
                            <p className="font-body-sm text-body-sm text-on-surface-variant truncate" title={`Cost: ${formatCurrency(kpiTotals.actualCost)}`}>
                                {formatCompactCurrency(kpiTotals.actualCost)} Cost
                            </p>
                        </div>
                    </div>

                    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-2.5 flex items-center gap-2.5 hover:shadow-md transition-shadow">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${kpiTotals.remaining < 0 ? 'bg-error/15' : 'bg-tertiary-container'}`}>
                            <span className={`material-symbols-outlined text-[16px] ${kpiTotals.remaining < 0 ? 'text-error' : 'text-on-tertiary-container'}`}>savings</span>
                        </div>
                        <div className="min-w-0">
                            <p className="font-label-caps text-label-caps text-on-surface-variant truncate">Remaining Forecast (Unused)</p>
                            <p className={`text-lg font-semibold truncate ${kpiTotals.remaining < 0 ? 'text-error' : 'text-on-surface'}`} title={formatCurrency(kpiTotals.remaining)}>
                                {formatCompactCurrency(kpiTotals.remaining)}
                            </p>
                        </div>
                    </div>

                    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-2.5 flex items-center gap-2.5 hover:shadow-md transition-shadow">
                        <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-on-surface-variant text-[16px]">folder_open</span>
                        </div>
                        <div className="min-w-0">
                            <p className="font-label-caps text-label-caps text-on-surface-variant truncate">Number of Projects</p>
                            <p className="text-lg font-semibold text-on-surface truncate">
                                {kpiTotals.count.toLocaleString('en-US')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tab Container */}
                <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden border border-outline-variant">
                    <div className="flex items-center justify-between gap-6 px-container-padding border-b border-outline-variant bg-white">
                        <div className="flex items-center gap-6">
                            {[
                                { key: 'Tab1', label: 'Budget 5 Years' },
                                { key: 'Tab2', label: 'Year To Date' },
                                ...(isViewer ? [] : [{ key: 'Tab3', label: 'Forecasts' }]),
                            ].map((tab) => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`py-4 border-b-2 font-label-caps text-label-caps tracking-wide transition-colors active:scale-95 ${
                                        activeTab === tab.key
                                            ? "border-primary text-primary font-bold"
                                            : "border-transparent text-on-surface-variant hover:text-primary font-medium"
                                    }`}
                                >
                                    {tab.label.toUpperCase()}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={handleFullscreen}
                            title="Full Screen"
                            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-primary transition-all active:scale-95 shrink-0"
                        >
                            <span className="material-symbols-outlined text-[20px]">fullscreen</span>
                        </button>
                    </div>

                    {loading ? (
                        <div className="p-6 flex items-center gap-2 text-on-surface-variant">
                            <Spinner color="text-primary"/>
                            Loading data, please wait...
                        </div>
                    ) : isTab3 ? (
                        <ForecastsDashboard
                            rowData={rowData}
                            startYear={startYear}
                            yearlyBudget={yearlyBudget}
                            year={startYear}
                            onSelectProject={handleSelectExceptionProject}
                        />
                    ) : (
                        <div ref={gridRef} className="ag-theme-alpine"
                             style={{height: "calc(100vh - 260px)", width: "100%"}}>
                            <AgGridReact
                                ref={agGridRef}
                                rowData={rowData}
                                columnDefs={columnDefs}
                                defaultColDef={{
                                    ...defaultColDef,
                                    // The pinned "Total" row (see pinnedTopRowData below) is a
                                    // client-computed aggregate, not a real project — it doesn't
                                    // have a numeric `id` (calculateTotals() sets id: 'Total (USD)'),
                                    // so editing it and triggering a save PUTs to
                                    // /budgets/Total%20(USD), which 404s. Never editable regardless
                                    // of version/lock state.
                                    editable: (params) => !params.node.rowPinned && isLatestVersion && !isFinal && !isViewer,
                                }}
                                suppressClickEdit={!(isLatestVersion && !isFinal && !isViewer)}  // <--- prevent entering edit mode
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
                                onGridReady={onGridReady}
                                onColumnVisible={onColumnVisibleForStorage}
                                onFilterChanged={onFilterChangedCombined}
                                onFirstDataRendered={recomputeKpiTotals}
                                onRowDataUpdated={recomputeKpiTotals}
                            />
                        </div>
                    )}
                </div>
            </div>

            {isLatestVersion && !isFinal && !isViewer && (
                <button
                    onClick={handleAddNewRow}
                    title="Add new budget row"
                    className="fixed bottom-10 right-10 w-14 h-14 bg-primary text-on-primary rounded-full shadow-lg shadow-primary/30 hover:shadow-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 z-50 group"
                >
                    <span className="material-symbols-outlined text-2xl transition-transform group-hover:rotate-90">add</span>
                </button>
            )}

            <UploadModalDetail
                show={showModal}
                onClose={() => {
                    if (!loading) setShowModal(false);
                }}
                onSubmit={handleImport}
                loading={loading}
            />

            <Modal show={showFindReplace} onClose={() => { if (!findReplaceLoading) setShowFindReplace(false); }} maxWidth="md">
                <div className="p-6 space-y-4">
                    <h3 className="font-title-sm text-title-sm text-on-surface">Find &amp; Replace</h3>
                    <p className="text-body-sm text-on-surface-variant">
                        Replaces every occurrence of the text below within one column, across every project in this version. You'll see a preview before anything is saved.
                    </p>

                    <div>
                        <label className="block text-sm font-medium text-on-surface-variant mb-1">Column</label>
                        <select
                            value={findReplaceField}
                            onChange={(e) => setFindReplaceField(e.target.value)}
                            className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm"
                        >
                            {FIND_REPLACE_FIELDS.map((field) => (
                                <option key={field} value={field}>{HISTORY_FIELD_LABELS[field] || field}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-on-surface-variant mb-1">Find</label>
                        <input
                            type="text"
                            value={findText}
                            onChange={(e) => setFindText(e.target.value)}
                            autoFocus
                            className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-on-surface-variant mb-1">Replace with</label>
                        <input
                            type="text"
                            value={replaceText}
                            onChange={(e) => setReplaceText(e.target.value)}
                            placeholder="(leave empty to remove the found text)"
                            className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm"
                        />
                    </div>

                    <label className="flex items-center gap-2 text-sm text-on-surface-variant cursor-pointer">
                        <input type="checkbox" checked={matchCase} onChange={(e) => setMatchCase(e.target.checked)} />
                        Match case
                    </label>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setShowFindReplace(false)}
                            disabled={findReplaceLoading}
                            className="px-4 py-2 bg-surface-container text-on-surface-variant rounded-lg font-label-caps text-label-caps hover:bg-surface-container-high transition-all disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleFindReplace}
                            disabled={findReplaceLoading || !findText}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-label-caps text-label-caps hover:brightness-110 transition-all disabled:opacity-50"
                        >
                            {findReplaceLoading && <Spinner />}
                            Find &amp; Replace
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal show={showTrendModal} onClose={() => setShowTrendModal(false)} maxWidth="6xl">
                <ProjectTrendChart
                    project={selectedRowsState?.[0]}
                    startYear={startYear}
                    endYear={endYear}
                />
                <div className="flex justify-end px-6 pb-6">
                    <button
                        onClick={() => setShowTrendModal(false)}
                        className="px-4 py-2 bg-surface-container text-on-surface-variant rounded-lg font-label-caps text-label-caps hover:bg-surface-container-high transition-all"
                    >
                        Close
                    </button>
                </div>
            </Modal>

            <Modal show={loadingFinalize}>
                <div className="flex flex-col items-center justify-center h-48 p-4 text-center">
                    <Spinner color="text-primary" />
                    <p className="mt-3 text-on-surface-variant">Loading process finalize, please wait...</p>
                </div>
            </Modal>

            {/* Bulk deletes (many rows) block the page with a clear "still working"
                indicator — a single-row delete already gets its own inline spinner
                on the trash button, so this only fires for multi-row batches. */}
            <Modal show={deletingData && deletingCount > 1}>
                <div className="flex flex-col items-center justify-center h-48 p-4 text-center">
                    <Spinner color="text-error" />
                    <p className="mt-3 text-on-surface-variant">Deleting {deletingCount} budgets, please wait...</p>
                </div>
            </Modal>

            <Modal show={!!historyProject} onClose={() => setHistoryProject(null)} maxWidth="2xl">
                <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h3 className="text-title-md font-semibold text-on-surface">Change History</h3>
                            <p className="text-body-sm text-on-surface-variant">{historyProject?.project_title}</p>
                        </div>
                        <button
                            onClick={() => setHistoryProject(null)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-all"
                        >
                            <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                    </div>

                    <div className="max-h-[60vh] overflow-y-auto">
                        {historyLoading ? (
                            <div className="flex items-center justify-center py-10">
                                <Spinner color="text-primary" />
                            </div>
                        ) : historyLogs.length === 0 ? (
                            <p className="text-body-sm text-on-surface-variant text-center py-10">No changes recorded yet for this project.</p>
                        ) : (
                            <ul className="divide-y divide-surface-container-high">
                                {historyLogs.map((log) => (
                                    <li key={log.id} className="py-3">
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-on-surface text-body-sm">
                                                {HISTORY_FIELD_LABELS[log.field] || log.field}
                                            </span>
                                            <span className="text-label-caps text-on-surface-variant">
                                                {new Date(log.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="mt-1 text-body-sm">
                                            <span className="text-error/70 line-through">{formatHistoryValue(log.old_value)}</span>
                                            <span className="mx-2 text-on-surface-variant">→</span>
                                            <span className="text-primary font-medium">{formatHistoryValue(log.new_value)}</span>
                                        </div>
                                        <p className="mt-0.5 text-label-caps text-on-surface-variant">
                                            by {log.user?.name || 'Unknown'}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </Modal>

        </AuthenticatedLayout>
    )
}

// any change will re count the cell
