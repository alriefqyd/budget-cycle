<?php

namespace App\Services;

use App\Http\Controllers\HomeController;
use App\Models\BudgetSetting;
use App\Models\CashCostMonthly;
use App\Models\CashCostYearly;
use App\Models\Projects;

class ProjectsService
{
    public function saveProject($request){
        $data = Projects::create([
            'sap_code' => $request->sap_code,
            'project_title' => $request->project_title,
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

    public function updateChart(){
        $homeController = new HomeController();
        $year = date('Y');
        $dataChart = $homeController->getCashCostYearly($year);
        broadcast(new \App\Events\DashboardUpdated($dataChart->toArray()));
    }

}
