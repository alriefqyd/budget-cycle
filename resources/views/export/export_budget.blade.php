<table border="1" cellspacing="0" cellpadding="5">
    <thead>
    <tr>
        <td>ID</td>
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
        <th>Actual Up to 2024 Cost</th>
        <th>Actual Up to 2024 Cash</th>
        <th>A/F 2025 Cost</th>
        <th>A/F 2025 Cash</th>
        <th>Budget 5YP_Cost</th>
        <th>Budget 5YP_Cash</th>
        <th>Start year</th>
        <th>Budget Year 1/2/3/4/5</th>
        <th>Fund</th>
        <th>Cash - Total 2026 (USD)</th>
        <th>Cash - Total 2027 (USD)</th>
        <th>Cash - Total 2028 (USD)</th>
        <th>Cash - Total 2029</th>
        <th>Cash - Total 2030</th>
        <th>Cash 2026-2030 (USD)</th>
        <th>Cost 2026 (USD)</th>
        <th>Cost 2027 (USD)</th>
        <th>Cost 2028 (USD)</th>
        <th>Cost 2029 (USD)</th>
        <th>Cost 2030 (USD)</th>
        <th>Cost 2026-2030 (USD)</th>

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
            <td>{{ $budget['cash_2026'] }}</td>
            <td>{{ $budget['cash_2027'] }}</td>
            <td>{{ $budget['cash_2028'] }}</td>
            <td>{{ $budget['cash_2029'] }}</td>
            <td>{{ $budget['cash_2030'] }}</td>
            <td>{{ $budget['total_cash'] }}</td>
            <td>{{ $budget['cost_2026'] }}</td>
            <td>{{ $budget['cost_2027'] }}</td>
            <td>{{ $budget['cost_2028'] }}</td>
            <td>{{ $budget['cost_2029'] }}</td>
            <td>{{ $budget['cost_2030'] }}</td>
            <td>{{ $budget['total_cost'] }}</td>

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
