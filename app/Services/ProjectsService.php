<?php

namespace App\Services;

use App\Events\BudgetUpdated;
use App\Http\Controllers\HomeController;
use App\Models\BudgetSetting;
use App\Models\CashCostMonthly;
use App\Models\CashCostYearly;
use App\Models\Projects;

class ProjectsService
{
    public function saveProject($request){
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
            'risk'=> $request->risk,
            'fm_new' => $request->fm_new,
            'year_period' => $request->year_period,
            'start_year' => $request->year
        ]);

        return $data;
    }

    public function saveBudget($project,$data){
        BudgetSetting::create([
            'project_id' => $project->id,
            'actual_to_date' => $data?->actual_to_date,
            'budget_5yp' => $data?->budget_5yp,
            'start_year' => $data?->start_year,
            'num_of_year_budget' => $data?->num_of_year_budget,
            'total_cash' => $data?->total_cash,
            'total_cost' => $data?->total_cost,
            'budget_car' => $data?->budget_car,
            'cash_remaining' => $data?->cash_remaining,
            'cost_remaining' => $data?->cost_remaining,
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
                    'year_period' => $project->year_period,
                    'status_progress' => $project->status_progress,
                    'note' => $project->note,
                    'sap_code' => $project->sap_code,
                    'project_manager' => $project->project_manager,
                    'project_control' => $project->project_control,
                    'directorate' => $project->directorate,
                    'owner_area' => $project->owner_area,
                    'type_of_investment' => $project->type_of_investment,
                    'category'=>$project->category,
                    'risk'=>$project->risk,
                    'fm_new'=>$project->fm_new,
                    'budget_5yp'=>$project->budgets?->budget_5yp,
                    'budget_car'=>$project->budgets?->budget_car,
                    'actual_to_date'=>$project->budgets?->actual_to_date,
                    'start_year'=>$project->budgets?->start_year,
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

    public function updateChart(){
        $homeController = new HomeController();
        $year = date('Y');
        $dataChart = $homeController->getCashCostYearly($year);
        broadcast(new \App\Events\DashboardUpdated($dataChart->toArray()));
    }

    public function updateBudgets($year, $id){
        broadcast(new BudgetUpdated($this->getBudgetsByYear($year, $id)));
    }

}
