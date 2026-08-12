@php
    // Guards against a DB value that happens to start with a formula-trigger
    // character (=, +, -, @) being written into the exported .xlsx as a real
    // Excel formula instead of literal text. This isn't hypothetical: a past
    // import bug left a handful of projects with literal
    // "=_xlfn.XLOOKUP(...)" text stuck in directorate/owner_area, and
    // PhpSpreadsheet's ShouldAutoSize column-width pass tries to *calculate*
    // every formula cell it writes — for an XLOOKUP against an external
    // workbook that isn't loaded, that calculation always fails and crashes
    // the whole export with an uncaught exception. A leading apostrophe
    // forces PhpSpreadsheet (and Excel, if the file is re-opened and edited)
    // to treat the cell as plain text no matter what character follows.
    $safe = function ($value) {
        if (is_string($value) && $value !== '' && in_array($value[0], ['=', '+', '-', '@'], true)) {
            return "'" . $value;
        }
        return $value;
    };
@endphp
<table border="1" cellspacing="0" cellpadding="5">
    <thead>
    <tr>
        <th>ID</th>
        <th>SAP Code</th>
        <th>Project´s Title</th>
        <th>Note</th>
        <th>ongoing/new</th>
        <th>PM</th>
        <th>PC</th>
        <th>Directorate</th>
        <th>Owner Area</th>
        <th>Type of Investment</th>
        <th>Category</th>
        <th>Risk Residual</th>
        <th>Risk Forecast</th>
        <th>BC Budget</th>
        <th>Approved Budget</th>
        <th>Actual Up to {{ now()->year - 1 }} Cost</th>
        <th>Actual Up to {{ now()->year - 1 }} Cash</th>
        <th>A/F {{ now()->year }} Cost</th>
        <th>A/F {{ now()->year }} Cash</th>
        <th>Budget 5YP Cost</th>
        <th>Budget 5YP Cash</th>
        <th>Start year</th>
        <th>Budget Year 1/2/3/4/5</th>
        <th>Fund</th>
        <th>Cost {{ $year }} (USD)</th>
        <th>Cost {{ $year + 1 }} (USD)</th>
        <th>Cost {{ $year + 2 }} (USD)</th>
        <th>Cost {{ $year + 3 }} (USD)</th>
        <th>Cost {{ $year + 4 }} (USD)</th>
        <th>Cost {{ $year }}-{{ $year + 4 }} (USD)</th>
        <th>Cash {{ $year }} (USD)</th>
        <th>Cash {{ $year + 1 }} (USD)</th>
        <th>Cash {{ $year + 2 }} (USD)</th>
        <th>Cash {{ $year + 3 }}</th>
        <th>Cash {{ $year + 4 }}</th>
        <th>Cash {{ $year }}-{{ $year + 4 }} (USD)</th>

        <!-- Monthly Forecast Cost 2025 -->
        <th>Jan-26 Cost</th>
        <th>Feb-27 Cost</th>
        <th>Mar-28 Cost</th>
        <th>Apr-29 Cost</th>
        <th>May-30 Cost</th>
        <th>Jun-31 Cost</th>
        <th>Jul-32 Cost</th>
        <th>Aug-33 Cost</th>
        <th>Sep-34 Cost</th>
        <th>Oct-35 Cost</th>
        <th>Nov-36 Cost</th>
        <th>Dec-37 Cost</th>
        <th>Total 2026 Cost</th>

        <!-- Monthly Forecast Cash 2025 -->
        <th>Jan-26 Cash</th>
        <th>Feb-26 Cash</th>
        <th>Mar-26 Cash</th>
        <th>Apr-26 Cash</th>
        <th>May-26 Cash</th>
        <th>Jun-26 Cash</th>
        <th>Jul-26 Cash</th>
        <th>Aug-26 Cash</th>
        <th>Sep-26 Cash</th>
        <th>Oct-26 Cash</th>
        <th>Nov-26 Cash</th>
        <th>Dec-26 Cash</th>
        <th>Total 2026 Cash</th>

        <!-- Monthly Forecast Cost 2026 -->
        <th>Jan-27 Cost</th>
        <th>Feb-27 Cost</th>
        <th>Mar-27 Cost</th>
        <th>Apr-27 Cost</th>
        <th>May-27 Cost</th>
        <th>Jun-27 Cost</th>
        <th>Jul-27 Cost</th>
        <th>Aug-27 Cost</th>
        <th>Sep-27 Cost</th>
        <th>Oct-27 Cost</th>
        <th>Nov-27 Cost</th>
        <th>Dec-27 Cost</th>
        <th>Total 2027 Cost</th>

        <!-- Monthly Forecast Cash 2026 -->
        <th>Jan-27 Cash</th>
        <th>Feb-27 Cash</th>
        <th>Mar-27 Cash</th>
        <th>Apr-27 Cash</th>
        <th>May-27 Cash</th>
        <th>Jun-27 Cash</th>
        <th>Jul-27 Cash</th>
        <th>Aug-27 Cash</th>
        <th>Sep-27 Cash</th>
        <th>Oct-27 Cash</th>
        <th>Nov-27 Cash</th>
        <th>Dec-27 Cash</th>
        <th>Total 2027 Cash</th>

        <!-- Commitment: kept as the very last two columns, after every other
             column, so its position stays stable regardless of how many
             monthly placeholder columns precede it. -->
        <th>Commitment {{ $year - 1 }} (USD)</th>
        <th>Commitment {{ $year }} (USD)</th>
    </tr>
    </thead>
    <tbody>

    @foreach($budgets as $budget)
        <tr>
            <td>{{ $budget['id'] }}</td>
            <td>{{ $safe($budget['sap_code']) }}</td>
            <td>{{ $safe($budget['project_title']) }}</td>
            <td>{{ $safe($budget['note']) }}</td>
            <td>{{ $safe($budget['status_progress']) }}</td>
            <td>{{ $safe($budget['project_manager']) }}</td>
            <td>{{ $safe($budget['project_control']) }}</td>
            <td>{{ $safe($budget['directorate']) }}</td>
            <td>{{ $safe($budget['owner_area']) }}</td>
            <td>{{ $safe($budget['type_of_investment']) }}</td>
            <td>{{ $safe($budget['category']) }}</td>
            <td>{{ $safe($budget['risk_residual']) }}</td>
            <td>{{ $safe($budget['risk_forecast']) }}</td>
            <td>{{ $budget['bc_budget'] }}</td>
            <td>{{ $budget['budget_car'] }}</td>
            <td>{{ $budget['actual_to_date_cost'] }}</td>
            <td>{{ $budget['actual_to_date'] }}</td>
            <td>{{ $budget['forecast_cost'] }}</td>
            <td>{{ $budget['forecast_cash'] }}</td>
            <td>{{ $budget['budget_5yp_cost'] }}</td>
            <td>{{ $budget['budget_5yp'] }}</td>
            <td>{{ $budget['start_year'] ?? '-' }}</td>
            <td>{{ $budget['num_of_year_budget'] }}</td>
            <td>{{ $safe($budget['fm_new']) }}</td>
            <td>{{ $budget['cost_'.$year] ?? 0 }}</td>
            <td>{{ $budget['cost_'.($year + 1)] ?? 0 }}</td>
            <td>{{ $budget['cost_'.($year + 2)] ?? 0 }}</td>
            <td>{{ $budget['cost_'.($year + 3)] ?? 0 }}</td>
            <td>{{ $budget['cost_'.($year + 4)] ?? 0 }}</td>
            <td>{{ $budget['total_cost'] ?? 0 }}</td>
            <td>{{ $budget['cash_'.$year] ?? 0 }}</td>
            <td>{{ $budget['cash_'.($year + 1)] ?? 0 }}</td>
            <td>{{ $budget['cash_'.($year + 2)] ?? 0 }}</td>
            <td>{{ $budget['cash_'.($year + 3)] ?? 0 }}</td>
            <td>{{ $budget['cash_'.($year + 4)] ?? 0 }}</td>
            <td>{{ $budget['total_cash'] ?? 0 }}</td>

            {{-- Placeholder for the 4 monthly sections above (Cost/Cash x
            2026/2027, 13 columns each = 52) -- kept as blank "-" cells since
            this data isn't tracked per-month here. Count must match the
            header exactly so Commitment below lands in the right column. --}}
            @for ($i = 0; $i < 52; $i++)
                <td>-</td>
            @endfor

            <td>{{ $budget['commitment_'.($year - 1)] ?? 0 }}</td>
            <td>{{ $budget['commitment_'.$year] ?? 0 }}</td>
        </tr>
    @endforeach
    </tbody>
</table>
