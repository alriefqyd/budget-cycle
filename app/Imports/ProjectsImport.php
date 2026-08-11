<?php

namespace App\Imports;

use App\Events\BudgetListUpdated;
use App\Models\BudgetSetting;
use App\Models\CashCostYearly;
use App\Models\project;
use App\Models\Projects;
use App\Services\ProjectsService;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Concerns\Importable;
use Maatwebsite\Excel\Concerns\RegistersEventListeners;
use Maatwebsite\Excel\Concerns\RemembersRowNumber;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithBatchInserts;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStartRow;
use Maatwebsite\Excel\Concerns\WithUpserts;
use Maatwebsite\Excel\Events\AfterImport;

class ProjectsImport implements ToModel, WithMapping, WithStartRow, WithBatchInserts,
    WithUpserts, WithChunkReading, WithEvents
{
    /**
     * @param array $row
     *
     * @return \Illuminate\Database\Eloquent\Model|null
     */
    use RemembersRowNumber;
    use Importable;
    use RegistersEventListeners;

    private $uniqueIdentifiers = [];
    private $processedCount = 0;
    private $rejectedSapCodes = [];
    public function __construct($year, $isBudgetCycle, $budgetCyclePeriodId){
        $this->year = $year;
        $this->isBudgetCycle = $isBudgetCycle;
        $this->budgetCyclePeriodId = $budgetCyclePeriodId;
    }
    public function batchSize(): int{
        return 1000;
    }

    public function chunkSize(): int{
        return 500;
    }

    public function startRow(): int{
        return 2;
    }

    public function uniqueBy(){
        return 'SAP Code';
    }

    public function getImportedSapCodes(): array{
        return array_values(array_unique(array_filter($this->uniqueIdentifiers, fn ($code) => $code !== null)));
    }

    // Distinct from getImportedSapCodes(): that method records every SAP code
    // *seen* in the file (used to protect rows from stale-deletion), even ones
    // that failed the format check below and were never actually persisted.
    // This is the true "did anything happen" signal — callers should treat a
    // non-empty file with zero processed rows as a failure, not a silent success.
    public function getProcessedCount(): int{
        return $this->processedCount;
    }

    public function getRejectedSapCodes(): array{
        return array_values(array_unique($this->rejectedSapCodes));
    }

    public function map($row): array{
        return [
            'sap_code' => isset($row[1]) ? trim($row[1]) : null,
            'project_title' => $row[2] ?? "",
            'note' => $row[3] ?? "",
            'status_progress' => $row[4] ?? "",
            'project_manager' => $row[5] ?? "",
            'project_control' => $row[6] ?? "",
            'directorate' => $row[7] ?? "",
            'owner_area' => $row[8] ?? "",
            'type_of_investment' => $row[9] ?? "",
            'category' => $row[10] ?? "",
            'risk_residual' => $row[11] ?? "",
            'risk_forecast' => $row[12] ?? "",
            'bc_budget' => $row[13] ?? "",
            'year_period' => $this->year,
            'budget_car' => $row[14] ?? "",
            'actual_to_date_cost' => $row[15] ?? "",
            'actual_to_date' => $row[16] ?? "",
            'forecast_cost' => $row[17] ?? "",
            'forecast_cash' => $row[18] ?? "",
            'budget_5yp_cost' => $row[19] ?? "",
            'budget_5yp' => $row[20] ?? "",
            'start_year' => $row[21] ?? "",
            'num_of_year_budget' => $row[22] ?? "",
            'fm_new' => $row[23] ?? "",
            'cost_first' => $row[24] ?? "",
            'cost_second' => $row[25] ?? "",
            'cost_third' => $row[26] ?? "",
            'cost_fourth' => $row[27] ?? "",
            'cost_fifth' => $row[28] ?? "",
            'cost_total' => $row[29] ?? "",
            'cash_first' => $row[30] ?? "",
            'cash_second' => $row[31] ?? "",
            'cash_third' => $row[32] ?? "",
            'cash_fourth' => $row[33] ?? "",
            'cash_fifth' => $row[34] ?? "",
            'cash_total' => $row[35] ?? "",
            // Commitment only covers two years — the year before the cycle
            // starts and the cycle's start year itself (matches the Show.jsx
            // grid's commitment window).
            'commitment_previous_year' => $row[36] ?? "",
            'commitment_current_year' => $row[37] ?? "",
        ];
    }


    public function model(array $row)
    {
        $cashFields = [
            'cash_first',
            'cash_second',
            'cash_third',
            'cash_fourth',
            'cash_fifth',
        ];

        $costFields = [
            'cost_first',
            'cost_second',
            'cost_third',
            'cost_fourth',
            'cost_fifth',
        ];

        $project = null;
        // Mark SAP code as imported
        $this->uniqueIdentifiers[] = $row['sap_code'];
        if ($row['sap_code'] !== null && preg_match('/^C[0-9]/', $row['sap_code'])) {
            $this->processedCount++;
            if ($this->isBudgetCycle) {
                // Check if existing project within this budget cycle version
                $project = Projects::firstOrNew([
                    'sap_code' => $row['sap_code'],
                    'budget_cycle_period_id' => $this->budgetCyclePeriodId,
                ]);

                // Fill other updatable fields
                $project->fill([
                    'project_title' => $row['project_title'],
                    'note' => $row['note'],
                    'status_progress' => $row['status_progress'],
                    'project_manager' => $row['project_manager'],
                    'project_control' => $row['project_control'],
                    'directorate' => $row['directorate'],
                    'owner_area' => $row['owner_area'],
                    'type_of_investment' => $row['type_of_investment'],
                    'category' => $row['category'],
                    'risk_residual' => $row['risk_residual'],
                    'risk_forecast' => $row['risk_forecast'],
                    'fm_new' => $row['fm_new'],
                    'year_period' => $row['year_period'],
                ]);
                $project->save();
            } else {
                $project = Projects::create([
                    'sap_code' => $row['sap_code'],
                    'project_title' => $row['project_title'],
                    'note' => $row['note'],
                    'status_progress' => $row['status_progress'],
                    'project_manager' => $row['project_manager'],
                    'project_control' => $row['project_control'],
                    'directorate' => $row['directorate'],
                    'owner_area' => $row['owner_area'],
                    'type_of_investment' => $row['type_of_investment'],
                    'category' => $row['category'],
                    'risk_residual' => $row['risk_residual'],
                    'risk_forecast' => $row['risk_forecast'],
                    'fm_new' => $row['fm_new'],
                    'year_period' => $row['year_period'],
                    'budget_cycle_period_id' => $this->budgetCyclePeriodId
                ]);
            }

            /* CASH LOOP */
            $totalCash = 0;
            for ($i = 0; $i < count($cashFields); $i++) {
                $year = $this->year + $i;
                $cashKey = $cashFields[$i];
                $amount = is_numeric($row[$cashKey]) ? $row[$cashKey] : null;
                $totalCash += $amount;
                CashCostYearly::updateOrCreate(
                    [
                        'year' => $year,
                        'project_id' => $project->id,
                        'type' => 'cash',
                    ],
                    [
                        'amount' => $amount,
                    ]
                );
            }

            $totalCost = 0;
            for ($i = 0; $i < count($costFields); $i++) {
                $year = $this->year + $i;
                $cashKey = $costFields[$i];
                $amount = is_numeric($row[$cashKey]) ? $row[$cashKey] : null;
                $totalCost += $amount;
                CashCostYearly::updateOrCreate(
                    [
                        'year' => $year,
                        'project_id' => $project->id,
                        'type' => 'cost',
                    ],
                    [
                        'amount' => $amount,
                    ]
                );
            }

            /* COMMITMENT: previous year + current year of the cycle only */
            $commitmentFields = [
                $this->year - 1 => 'commitment_previous_year',
                $this->year => 'commitment_current_year',
            ];
            foreach ($commitmentFields as $commitmentYear => $commitmentKey) {
                $amount = is_numeric($row[$commitmentKey]) ? $row[$commitmentKey] : null;
                CashCostYearly::updateOrCreate(
                    [
                        'year' => $commitmentYear,
                        'project_id' => $project->id,
                        'type' => 'commitment',
                    ],
                    [
                        'amount' => $amount,
                    ]
                );
            }

            $budget5yp = ((float)$row['budget_car'] ?? 0) - ((float)$row['actual_to_date'] ?? 0) - ((float)$row['forecast_cash'] ?? 0);
            $budget5yp_cost = ((float)$row['budget_car'] ?? 0) - ((float)$row['actual_to_date_cost'] ?? 0) - ((float)$row['forecast_cost'] ?? 0);

            // Delete first if is budget cycle
            // Ensure the project is saved and has an ID before using it
            BudgetSetting::updateOrCreate([
                ['project_id', $project->id]],
                [
                    'budget_car' => is_numeric($row['budget_car']) ? $row['budget_car'] : null,
                    'bc_budget' => is_numeric($row['bc_budget']) ? $row['bc_budget'] : null,
                    'actual_to_date' => is_numeric($row['actual_to_date'] ?? null) ? $row['actual_to_date'] : null,
                    'actual_to_date_cost' => is_numeric($row['actual_to_date_cost'] ?? null) ? $row['actual_to_date_cost'] : null,
                    'budget_5yp' => $budget5yp,
                    'budget_5yp_cost' => $budget5yp_cost,
                    'forecast_cost' => is_numeric($row['forecast_cost'] ?? null) ? $row['forecast_cost'] : null,
                    'forecast_cash' => is_numeric($row['forecast_cash'] ?? null) ? $row['forecast_cash'] : null,
                    'start_year' => is_numeric($row['start_year'] ?? null) ? $row['start_year'] : null,
                    'num_of_year_budget' => $row['num_of_year_budget'] ?? null,
                    'project_id' => $project->id,
                    'total_cash' => $totalCash,
                    'total_cost' => $totalCost,
                    'cost_remaining' => $budget5yp_cost - $totalCost,
                    'cash_remaining' => $budget5yp - $totalCash,
                ]
            );

            $projectService = new ProjectsService();
            if($this->isBudgetCycle){
                $projectService->updateBudgets($this->year, $project->id);
            }
        } elseif ($row['sap_code'] !== null) {
            // Seen but didn't match the expected SAP code format (e.g. must
            // start with "C" followed by a digit) — recorded so callers can
            // tell "file had rows but none were valid" apart from "empty file".
            $this->rejectedSapCodes[] = $row['sap_code'];
        }
    }

    public static function afterImport(AfterImport $event){
        Log::info('AfterImport event fired');
        $projectService = new ProjectsService();
        $data = $projectService->getDataProjectIndex();
        broadcast(new BudgetListUpdated($data->toArray()));
    }
}
