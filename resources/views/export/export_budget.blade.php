<table border="1" cellspacing="0" cellpadding="5">
    <thead>
    <tr>
        <th rowspan="2">ID</th>
        <th rowspan="2">SAP Code</th>
        <th rowspan="2">Project´s Title</th>
        <th rowspan="2">Note</th>
        <th rowspan="2">ongoing/new</th>
        <th rowspan="2">PM</th>
        <th rowspan="2">PC</th>
        <th rowspan="2">Directorate</th>
        <th rowspan="2">Owner Area</th>
        <th rowspan="2">Type of Investment</th>
        <th rowspan="2">Category</th>
        <th rowspan="2">Risk Residual</th>
        <th rowspan="2">Risk Forecast</th>
        <th rowspan="2">BC Budget</th>
        <th rowspan="2">Approved Budget</th>
        <th colspan="2">Actual Up to 2024</th>
        <th colspan="2">A/F 2025</th>
        <th colspan="2">Budget 5YP</th>
        <th rowspan="2">Start year</th>
        <th rowspan="2">Budget Year 1/2/3/4/5</th>
        <th rowspan="2">Fund</th>
        <th rowspan="2">Cost 2026 (USD)</th>
        <th rowspan="2">Cost 2027 (USD)</th>
        <th rowspan="2">Cost 2028 (USD)</th>
        <th rowspan="2">Cost 2029 (USD)</th>
        <th rowspan="2">Cost 2030 (USD)</th>
        <th rowspan="2">Cost 2026-2030 (USD)</th>
        <th rowspan="2">Cash 2026 (USD)</th>
        <th rowspan="2">Cash 2027 (USD)</th>
        <th rowspan="2">Cash 2028 (USD)</th>
        <th rowspan="2">Cash 2029</th>
        <th rowspan="2">Cash 2030</th>
        <th rowspan="2">Cash 2026-2030 (USD)</th>

        <!-- Monthly Forecast Cost 2025 -->
        <th rowspan="2">Jan-26 Cost</th>
        <th rowspan="2">Feb-27 Cost</th>
        <th rowspan="2">Mar-28 Cost</th>
        <th rowspan="2">Apr-29 Cost</th>
        <th rowspan="2">May-30 Cost</th>
        <th rowspan="2">Jun-31 Cost</th>
        <th rowspan="2">Jul-32 Cost</th>
        <th rowspan="2">Aug-33 Cost</th>
        <th rowspan="2">Sep-34 Cost</th>
        <th rowspan="2">Oct-35 Cost</th>
        <th rowspan="2">Nov-36 Cost</th>
        <th rowspan="2">Dec-37 Cost</th>
        <th rowspan="2">Total 2026 Cost</th>

        <!-- Monthly Forecast Cash 2025 -->
        <th rowspan="2">Jan-26 Cash</th>
        <th rowspan="2">Feb-26 Cash</th>
        <th rowspan="2">Mar-26 Cash</th>
        <th rowspan="2">Apr-26 Cash</th>
        <th rowspan="2">May-26 Cash</th>
        <th rowspan="2">Jun-26 Cash</th>
        <th rowspan="2">Jul-26 Cash</th>
        <th rowspan="2">Aug-26 Cash</th>
        <th rowspan="2">Sep-26 Cash</th>
        <th rowspan="2">Oct-26 Cash</th>
        <th rowspan="2">Nov-26 Cash</th>
        <th rowspan="2">Dec-26 Cash</th>
        <th rowspan="2">Total 2026 Cash</th>

        <!-- Monthly Forecast Cost 2026 -->
        <th rowspan="2">Jan-27 Cost</th>
        <th rowspan="2">Feb-27 Cost</th>
        <th rowspan="2">Mar-27 Cost</th>
        <th rowspan="2">Apr-27 Cost</th>
        <th rowspan="2">May-27 Cost</th>
        <th rowspan="2">Jun-27 Cost</th>
        <th rowspan="2">Jul-27 Cost</th>
        <th rowspan="2">Aug-27 Cost</th>
        <th rowspan="2">Sep-27 Cost</th>
        <th rowspan="2">Oct-27 Cost</th>
        <th rowspan="2">Nov-27 Cost</th>
        <th rowspan="2">Dec-27 Cost</th>
        <th rowspan="2">Total 2027 Cost</th>

        <!-- Monthly Forecast Cash 2026 -->
        <th rowspan="2">Jan-27 Cash</th>
        <th rowspan="2">Feb-27 Cash</th>
        <th rowspan="2">Mar-27 Cash</th>
        <th rowspan="2">Apr-27 Cash</th>
        <th rowspan="2">May-27 Cash</th>
        <th rowspan="2">Jun-27 Cash</th>
        <th rowspan="2">Jul-27 Cash</th>
        <th rowspan="2">Aug-27 Cash</th>
        <th rowspan="2">Sep-27 Cash</th>
        <th rowspan="2">Oct-27 Cash</th>
        <th rowspan="2">Nov-27 Cash</th>
        <th rowspan="2">Dec-27 Cash</th>
        <th rowspan="2">Total 2027 Cash</th>
    </tr>
    <tr>
        <th>Cost</th>
        <th>Cash</th>
        <th>Cost</th>
        <th>Cash</th>
        <th>Cost</th>
        <th>Cash</th>
    </tr>
    </thead>
    <tbody>

    @foreach($budgets as $budget)
        <tr>
            <td>{{ $budget['id'] }}</td>
            <td>{{ $budget['sap_code'] }}</td>
            <td>{{ $budget['project_title'] }}</td>
            <td>{{ $budget['note'] }}</td>
            <td>{{ $budget['status_progress'] }}</td>
            <td>{{ $budget['project_manager'] }}</td>
            <td>{{ $budget['project_control'] }}</td>
            <td>{{ $budget['directorate'] }}</td>
            <td>{{ $budget['owner_area'] }}</td>
            <td>{{ $budget['type_of_investment'] }}</td>
            <td>{{ $budget['category'] }}</td>
            <td>{{ $budget['risk_residual'] }}</td>
            <td>{{ $budget['risk_forecast'] }}</td>
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
            <td>{{ $budget['fm_new'] }}</td>
            <td>{{ $budget['cost_2026'] }}</td>
            <td>{{ $budget['cost_2027'] }}</td>
            <td>{{ $budget['cost_2028'] }}</td>
            <td>{{ $budget['cost_2029'] }}</td>
            <td>{{ $budget['cost_2030'] }}</td>
            <td>{{ $budget['total_cost'] }}</td>
            <td>{{ $budget['cash_2026'] }}</td>
            <td>{{ $budget['cash_2027'] }}</td>
            <td>{{ $budget['cash_2028'] }}</td>
            <td>{{ $budget['cash_2029'] }}</td>
            <td>{{ $budget['cash_2030'] }}</td>
            <td>{{ $budget['total_cash'] }}</td>

            {{-- Placeholder for monthly cost and cash (2025 and 2026) --}}
            <td>-</td> {{-- Jan-25 --}}
            <td>-</td> {{-- Feb-25 --}}
            <td>-</td> {{-- Mar-25 --}}
            <td>-</td> {{-- Apr-25 --}}
            <td>-</td> {{-- Total 2025 Cost --}}

            <td>-</td> {{-- Jan-25 Cash --}}
            <td>-</td> {{-- Feb-25 Cash --}}
            <td>-</td> {{-- Mar-25 Cash --}}
            <td>-</td> {{-- Apr-25 Cash --}}
            <td>-</td> {{-- Total 2025 Cash --}}

            <td>-</td> {{-- Jan-26 Cost --}}
            <td>-</td> {{-- Feb-26 Cost --}}
            <td>-</td> {{-- Mar-26 Cost --}}
            <td>-</td> {{-- Apr-26 Cost --}}
            <td>-</td> {{-- Total 2026 Cost --}}

            <td>-</td> {{-- Jan-26 Cash --}}
            <td>-</td> {{-- Feb-26 Cash --}}
            <td>-</td> {{-- Mar-26 Cash --}}
            <td>-</td> {{-- Apr-26 Cash --}}
            <td>-</td> {{-- Total 2026 Cash --}}
        </tr>
    @endforeach
    </tbody>
</table>
