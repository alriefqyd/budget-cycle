<?php

namespace App\Services;

use App\ApprovalStatus;
use App\Events\BudgetListUpdated;
use App\Events\BudgetUpdated;
use App\Http\Controllers\HomeController;
use App\Models\BudgetCyclePeriod;
use App\Models\BudgetSetting;
use App\Models\CashCostMonthly;
use App\Models\CashCostYearly;
use App\Models\Projects;
use Illuminate\Support\Facades\Log;

class ProjectsService
{
    public function getDataProjectIndex()
    {
        $projects = Projects::with(['budgets','cashCostYearlies'])->get();

        // Group by year_period
        $grouped = $projects->groupBy('year_period');

        // Transform each group
        $results = $grouped->map(function ($group, $year_period) {
            $start_year = (int) $year_period;
            $end_year = $start_year + 4;

            // Flatten all cashCostYearlies from the group
            $allYearly = $group->flatMap(function ($project) {
                return $project->cashCostYearlies;
            });

            // Total cost
            $total_cost = $allYearly->where('type', 'cost')->sum(function ($item) {
                return (float)$item->amount;
            });

            // Total cash
            $total_cash = $allYearly->where('type', 'cash')->sum(function ($item) {
                return (float)$item->amount;
            });


            // Build yearly summary from start_year to end_year
            $costCashYearlies = collect();
            for ($year = $start_year; $year <= $end_year; $year++) {
                foreach (['cost', 'cash'] as $type) {
                    $amount = $allYearly
                        ->where('year', (string)$year)
                        ->where('type', $type)
                        ->sum(function ($item) {
                            return (float)$item->amount;
                        });

                    $costCashYearlies->push((object)[
                        'year' => $year,
                        'type' => $type,
                        'amount' => $amount
                    ]);
                }
            }

            return (object)[
                'start_year' => $start_year,
                'end_year' => $end_year,
                'total_cost' => $total_cost,
                'total_cash' => $total_cash,
                'costCashYearlies' => $costCashYearlies
            ];
        });

        return $results->values(); // optional: reset keys
    }
    public function saveProject($request, $budgetCyclePeriod){
        $data = Projects::create([
            'project_title' => $request->project_title,
            'sap_code' => $request->sap_code,
            'note' => $request->note,
            'status_progress' => $request->status_progress,
            'project_manager' => $request->project_manager,
            'project_control' => $request->project_control,
            'directorate' => $request->directorate,
            'owner_area' => $request->owner_area,
            'type_of_investment' => $request->type_of_investment,
            'category' => $request->category,
            'risk_residual'=> $request->risk_residual,
            'risk_forecast' => $request->risk_forecast,
            'fm_new' => $request->fm_new,
            'year_period' => $request->year_period,
            'start_year' => $request->year,
            'budget_cycle_period_id' => $budgetCyclePeriod->id,
        ]);

        return $data;
    }

    public function saveBudgetCyclePeriod($request, $status){
        $data = BudgetCyclePeriod::create([
            'approval_status' => $status,
            'start_year' => $request->year,
            'end_year' => $request->year + 4,
            'total_cost' => 0,
            'total_cast' => 0
        ]);

        return $data;
    }

    public function saveBudget($project,$data){
        BudgetSetting::create([
            'project_id' => $project->id,
            'actual_to_date' => $data?->actual_to_date ?? null,
            'budget_5yp' => $data?->budget_5yp ?? null,
            'start_year' => $data?->start_year ?? null,
            'num_of_year_budget' => $data?->num_of_year_budget ?? null,
            'total_cash' => $data?->total_cash ?? null,
            'total_cost' => $data?->total_cost ?? null,
            'budget_car' => $data?->budget_car ?? null,
            'cash_remaining' => $data?->cash_remaining ?? null,
            'cost_remaining' => $data?->cost_remaining ?? null,
        ]);
    }

    public function saveCashCostYearly($project,$data){
        foreach ($data as $key => $value) {
            if (preg_match('/^(cash|cost)_(\d{4})$/', $key, $matches)) {
                $type = $matches[1];
                $year = $matches[2];
               CashCostYearly::create([
                    'project_id' => $project->id,
                    'type' => $type,
                    'year' => $year,
                    'amount' => $value,
                ]);
            }

            if (preg_match('/^(cash|cost)_(1[0-2]|[1-9])_(\d{4})$/', $key, $match)) {
                $type = $match[1]; // 'cash' or 'cost'
                $month = $match[2];
                $year = $match[3]; // e.g. '2025'
                $cashCostYearly = CashCostYearly::where('project_id', $project->id)->where('type', $type)->where('year', $year)->first();
                CashCostMonthly::create([
                    'yearly_id' => $cashCostYearly->id,
                    'month' => $month,
                    'amount' => $value,
                    'type' => $type,
                ]);
            }
        }
    }

    public function getBudgetsByYear($year, $id){
        $budgets = Projects::with(['budgets','cashCostYearlies'])
            ->when($id,function($query) use ($id){
                return $query->where('id', $id);
            })
            ->where('year_period', $year)
            ->get()
            ->map(function ($project) {
                $item = [
                    'id' => $project->id,
                    'project_title' => $project->project_title,
                    'year_period' => (string) $project->year_period,
                    'status_progress' => $project->status_progress,
                    'note' => $project->note,
                    'sap_code' => $project->sap_code,
                    'project_manager' => $project->project_manager,
                    'project_control' => $project->project_control,
                    'directorate' => $project->directorate,
                    'owner_area' => $project->owner_area,
                    'type_of_investment' => $project->type_of_investment,
                    'category'=>$project->category,
                    'risk_residual'=>$project->risk_residual,
                    'risk_forecast'=>$project->risk_forecast,
                    'fm_new'=>$project->fm_new,
                    'budget_5yp'=>$project->budgets?->budget_5yp,
                    'budget_5yp_cost'=>$project->budgets?->budget_5yp_cost,
                    'forecast_cost'=>$project->budgets?->forecast_cost,
                    'forecast_cash'=>$project->budgets?->forecast_cash,
                    'budget_car'=>$project->budgets?->budget_car,
                    'bc_budget' => $project->budgets?->bc_budget,
                    'actual_to_date'=>$project->budgets?->actual_to_date,
                    'actual_to_date_cost'=>$project->budgets?->actual_to_date_cost,
                    'start_year'=> (string) $project->budgets?->start_year,
                    'num_of_year_budget'=>$project->budgets?->num_of_year_budget,
                    'total_cash' => $project->budgets?->total_cash,
                    'total_cost' => $project->budgets?->total_cost,
                    'cash_remaining' => $project->budgets?->cash_remaining,
                    'cost_remaining' => $project->budgets?->cost_remaining,
                ];


                // Add dynamic cash_YYYY and cost_YYYY fields
                if ($project->cashCostYearlies && $project->cashCostYearlies->count()) {
                    foreach ($project->cashCostYearlies as $budget) {
                        if (!empty($budget->type) && !empty($budget->year)) {
                            $fieldName = "{$budget->type}_{$budget->year}";
                            $item[$fieldName] = $budget->amount;
                        }

                        if(sizeof($budget?->cashCostMonthly) > 0){
                            foreach ($budget?->cashCostMonthly as $monthly) {
                                if (!empty($budget->type) && !empty($monthly->month)) {
                                    $fieldName = "{$budget->type}_{$monthly->month}_{$budget->year}";
                                    $item[$fieldName] = $monthly->amount;
                                }
                            }
                            $totalYear = $budget->cashCostMonthly->sum('amount');
                            $item['total_'.$budget->type.'_'.$budget->year] = $totalYear;
                            $item[$budget->type.'_'.$budget->year.'_remaining'] = $budget->amount - $totalYear;
                        }
                    }
                }

                return $item;
            });

        if(isset($id)){
            $budgets = $budgets->first();
        } else {
            $budgets = $budgets->toArray(); ;
        }
        return $budgets;
    }

    public function getBudgetCostCashByStartYear($year){
        $project = Projects::with(['budgets','cashCostYearlies'])->where('year_period', $year)->get();
        $budget = [];
        $a = $project->map(function ($project) use (&$budget) {
            foreach($project->cashCostYearlies as $item){
                $arr = [
                    'project_id' => $project->id,
                    'year' => $item->year,
                    'amount' => $item->amount,
                    'type' => $item->type,
                ];
                array_push($budget, $arr);
            }
            return $budget;
        });
    }

    public function updateChart($year){
        $homeController = new HomeController();
        $dataChart = $homeController->getCashCostYearly($year);
        broadcast(new \App\Events\DashboardUpdated($dataChart));
    }

    public function updateBudgets($year, $id){
        broadcast(new BudgetUpdated($this->getBudgetsByYear($year, $id)));
    }

    public function updateBudgetList($year){
        $projectService = new ProjectsService();
        $data = $projectService->getDataProjectIndex();
        broadcast(new BudgetListUpdated($data->toArray()));
    }

}
