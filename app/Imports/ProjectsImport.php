<?php

namespace App\Imports;

use App\Models\BudgetSetting;
use App\Models\CashCostYearly;
use App\Models\project;
use App\Models\Projects;
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
    public function __construct($year){
        $this->year = $year;
    }
    public function batchSize(): int{
        return 500;
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

    public function map($row): array{
        return [
            'sap_code' => $row[1],
            'project_title' => $row[2],
            'note' => $row[3] ?? "",
            'status_progress' => $row[4] ?? "",
            'project_manager' => $row[5] ?? "",
            'project_control' => $row[6] ?? "",
            'directorate' => $row[7] ?? "",
            'owner_area' => $row[8] ?? "",
            'type_of_investment' => $row[9] ?? "",
            'category' => $row[10] ?? "",
            'risk' => $row[11] ?? "",
            'year_period' => $this->year,
            'budget_car' => $row[12] ?? "",
            'actual_to_date' => $row[13] ?? "",
            'budget_5yp' => $row[14] ?? "",
            'start_year' => $row[15] ?? "",
            'num_of_year_budget' => $row[16] ?? "",
            'fm_new' => $row[17] ?? "",
            'cash_first' => $row[18] ?? "",
            'cash_second' => $row[19] ?? "",
            'cash_third' => $row[20] ?? "",
            'cash_fourth' => $row[21] ?? "",
            'cash_fifth' => $row[22] ?? "",
            'cost_first' => $row[24] ?? "",
            'cost_second' => $row[25] ?? "",
            'cost_third' => $row[26] ?? "",
            'cost_fourth' => $row[27] ?? "",
            'cost_fifth' => $row[28] ?? "",

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

        $uniqueValue = $row['sap_code'];
        $this->uniqueIdentifiers[] = $uniqueValue;
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
            'risk' => $row['risk'],
            'fm_new' => $row['fm_new'],
            'year_period' => $row['year_period'],
        ]);

        /* CASH LOOP */
        $totalCash = 0;
        for ($i = 0; $i < count($cashFields); $i++) {
            $year = $this->year + $i;
            $cashKey = $cashFields[$i];
            $amount = is_numeric($row[$cashKey]) ? $row[$cashKey] : null;
            $totalCash += $amount;
            CashCostYearly::create([
                'year' => $year,
                'project_id' => $project->id,
                'type' => 'cash',
                'amount' => $amount,
            ]);
        }

        $totalCost = 0;
        for ($i = 0; $i < count($costFields); $i++) {
            $year = $this->year + $i;
            $cashKey = $costFields[$i];
            $amount = is_numeric($row[$cashKey]) ? $row[$cashKey] : null;
            $totalCost += $amount;
            CashCostYearly::create([
                'year' => $year,
                'project_id' => $project->id,
                'type' => 'cost',
                'amount' => $amount,
            ]);
        }

        // Ensure the project is saved and has an ID before using it
        BudgetSetting::create([
            'budget_car' => is_numeric($row['budget_car']) ? $row['budget_car'] : null,
            'actual_to_date' => is_numeric($row['actual_to_date'] ?? null) ? $row['actual_to_date'] : null,
            'budget_5yp' => is_numeric($row['budget_5yp'] ?? null) ? $row['budget_5yp'] : null,
            'start_year' => is_numeric($row['start_year'] ?? null) ? $row['start_year'] : null,
            'num_of_year_budget' => $row['num_of_year_budget'] ?? null,
            'project_id' => $project->id,
            'total_cash' => $totalCash,
            'total_cost' => $totalCost,
        ]);
    }

    public static function afterImport(AfterImport $event){
        Log::info('AfterImport event fired');
        $importInstance = $event->getConcernable();
        Projects::whereNotIn('sap_code', $importInstance->uniqueIdentifiers)->delete();
    }
}
