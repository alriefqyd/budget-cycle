<?php

namespace App\Http\Controllers;

use App\Imports\MaterialCategoryImport;
use App\Imports\MaterialImport;
use App\Imports\ProjectsImport;
use App\Models\BudgetSetting;
use App\Models\CashCostYearly;
use App\Models\Projects;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;


class ProjectsController extends Controller
{
    public function index(){
        $projects = Projects::get()->groupBy('year_period');
        return Inertia::render('Budgets/Index', [
            'projects' => $projects->map(function ($group) {
                return $group->values(); // ensure inner collections are clean arrays
            })
        ]);
    }

    public function show($year)
    {
        $budgets = Projects::with(['budgets','cashCostYearlies'])
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
                    'pc' => $project->pc,
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
                ];

                // Add dynamic cash_YYYY and cost_YYYY fields
                if ($project->cashCostYearlies && $project->cashCostYearlies->count()) {
                    foreach ($project->cashCostYearlies as $budget) {
                        if (!empty($budget->type) && !empty($budget->year)) {
                            $fieldName = "{$budget->type}_{$budget->year}";
                            $item[$fieldName] = $budget->amount;
                        }
                    }
                }

                return $item;
            })
            ->toArray(); // <- convert from Collection to plain array

        return Inertia::render('Budgets/Show', [
            'year' => $year,
            'budgets' => $budgets,
        ]);
    }

    public function upload(Request $request){
        $file = $request->file('file');
        if ($request->hasFile('file')) {
            Log::info('Starting import projects...');

            try {
                Excel::import(new ProjectsImport($request->year), $file);
                Log::info('Import project successful');
                return response()->json(['message' => 'Import Successful']);
            } catch (\Exception $e) {
                DB::rollback();
                Log::error('Import error: ' . $e->getMessage());
                return response()->json(['message' => $e->getMessage()], 500);
            }
        }

        Log::info('No file uploaded');
        return response()->json(['message' => 'No file uploaded'], 400);
    }

    public function update(Request $request, $id)
    {
        $project = Projects::with(['budgets','cashCostYearlies'])->findOrFail($id);
        $project->update($request->all());
        $budget = $project->budgets;
        if($budget){
            $budget->update($request->all());
        } else {
            $project->budgets()->create([
                'budget_cost' => $request->budget_cost,
                'actual_to_date' => $request->actual_to_date,
                'budget_5yp' => $request->budget_5yp,
                'start_year' => $request->start_year,
                'num_of_year_budget' => $request->num_of_year_budget,
                'total_cash' => $request->total_cash,
                'total_cost' => $request->total_cost,
                'cost_remaining' => $request->cost_remaining,
                'budget_car' => $request->budget_car,
                'project_id' => $request->id
            ]);
        }

        foreach ($request->all() as $key => $value) {
            if (preg_match('/^(cash|cost)_(\d{4})$/', $key, $matches)) {
                $type = $matches[1]; // 'cash' or 'cost'
                $year = $matches[2]; // e.g. '2025'

                $costCashYearly = CashCostYearly::where('year', $year)->where('type', $type)->where('project_id', $request->id)->first();
                // Save to DB, for example:
                if($costCashYearly){
                    $costCashYearly->amount = $value;
                    $costCashYearly->save();
                } else {
                    CashCostYearly::create([
                        'project_id' => $request->id,
                        'type' => $type,
                        'year' => $year,
                        'amount' => $value,
                    ]);
                }
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Budget updated successfully',
            'data' => $request->all()
        ]);
    }
}
