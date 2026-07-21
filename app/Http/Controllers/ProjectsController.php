<?php

namespace App\Http\Controllers;

use App\ApprovalStatus;
use App\Events\BudgetListUpdated;
use App\Events\BudgetUpdated;
use App\Exports\BudgetCyclePlanExport;
use App\Imports\MaterialCategoryImport;
use App\Imports\MaterialImport;
use App\Imports\ProjectsImport;
use App\Models\BudgetCyclePeriod;
use App\Models\BudgetSetting;
use App\Models\CashCostMonthly;
use App\Models\CashCostYearly;
use App\Models\Projects;
use App\Services\ProjectsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;
use Mockery\Exception;


class ProjectsController extends Controller
{
    public function index(){
        $projectService = new ProjectsService();
        $projects = $projectService->getDataProjectIndex();
        return Inertia::render('Budgets/Index', [
            'projects' => $projects
        ]);
    }

    public function show($year)
    {
        $projectService = new ProjectsService;
        $budgets = $projectService->getBudgetsByYear($year, null);
        $versions = $projectService->getVersionListByYear($year);
        $budgetVersion = BudgetCyclePeriod::where('start_year', $year)->orderBy('version', 'desc')->first();
        return Inertia::render('Budgets/Show', [
            'year' => $year,
            'budgets' => $budgets,
            'versions' => $versions,
            'budgetVersion' => $budgetVersion
        ]);
    }

    public function store(Request $request)
    {
        try {
            DB::beginTransaction();
            $projectService = new ProjectsService();
            $budgetCycle = $projectService->saveBudgetCyclePeriod($request, ApprovalStatus::APPROVED);
            $data = $projectService->saveProject($request, $budgetCycle);

            DB::commit();
            /** Websocket */
            $year = $request->year_period ?? $data->year_period;
            $projectService->updateChart($year);
            $projectService->updateBudgets($year, $data->id);
            return response()->json([
                'success' => true,
                'message' => 'Budget create successfully',
                'data' => $data //dont change this
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'data' => []
            ]);
        }
    }

    public function duplicate(Request $request){
        DB::beginTransaction();
        try {
            $projectService = new ProjectsService();
            $currentProject = $projectService->getDataProjectIndex();
            $projectList = collect();
            $year = $request->year_period ?? date('Y');
            foreach ($request->all() as $budget) {
                $data = (object) $budget;
                $budgetCycle = $projectService->saveBudgetCyclePeriod($request, ApprovalStatus::APPROVED);
                $project = $projectService->saveProject($data, $budgetCycle);
                $projectList->push($project);
                $budgetSetting = $projectService->saveBudget($project, $data);
                $cashCostYearly = $projectService->saveCashCostYearly($project, $data);
                broadcast(new BudgetUpdated($project->toArray()));
                broadcast(new BudgetListUpdated($currentProject->toArray()));
            }
            DB::commit();
            $projectService->updateChart($year);
            return response()->json([
                'success' => true,
                'message' => 'Budget duplicate successfully',
                'data' => $projectList
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'data' => []
            ]);
        }
    }

    public function upload(Request $request){
        $projectService = new ProjectsService();
        $data = $projectService->getDataProjectIndex();
        $file = $request->file('file');
        if ($request->hasFile('file')) {
            Log::info('Starting import projects...');
            try {
                $budgetCycle = $projectService->saveBudgetCyclePeriod($request, ApprovalStatus::APPROVED);
                Excel::import(new ProjectsImport($request->year, false, $budgetCycle->id), $file);
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

    public function export(Request $request){
        try {
            $projectService = new ProjectsService;
            $budgets = $projectService->getBudgetsByYear($request->year, null);
            return Excel::download(new BudgetCyclePlanExport($budgets), 'Budget-Cycle-'.$request->year.'.xlsx');
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        }
    }

    public function uploadProject(Request $request){
        $file = $request->file('file');

        if ($request->hasFile('file')) {
            Log::info('Starting import projects...');
            try {
                $projectService = new ProjectsService;
                $importClass = new ProjectsImport($request->year, true, null);
                Excel::import($importClass, $file);
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

    public function create(Request $request){
        try {
            $projectService = new ProjectsService;
            $budgetCyclePeriod = $projectService->saveBudgetCyclePeriod($request, ApprovalStatus::ON_GOING);
            $data = Projects::create([
                'project_title' => 'Project Title',
                'sap_code' => 'Sap Code',
                'year_period' => $request->year,
                'start_year' => $request->year,
                'budget_cycle_period_id' => $budgetCyclePeriod->id,
            ]);
            $projectService->updateBudgetList($request->year);
            return response()->json(['message' => 'Save Successful']);
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Save error: ' . $e->getMessage());
            return response()->json(['message' => $e->getMessage()], 500);
        }
        return response()->json(['message' => 'No Project Created'], 400);
    }

    public function update(Request $request, $id)
    {
        try {
            DB::beginTransaction();
            $project = Projects::with(['budgets','cashCostYearlies','budgetCyclePeriod'])->findOrFail($id);
            $projectService = new ProjectsService();
            if (!$projectService->isLatestVersion($project)) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'This budget cycle version is locked and can no longer be edited.',
                    'data' => false
                ], 423);
            }
            $project->update($request->all());
            $budget = $project->budgets;
            if($budget){
                $budget->update($request->all());
            } else {
                $project->budgets()->create([
                    'budget_cost' => $request->budget_cost,
                    'actual_to_date' => $request->actual_to_date,
                    'actual_to_date_cost' => $request->actual_to_date_cost,
                    'budget_5yp' => $request->budget_5yp,
                    'budget_5yp_cash' => $request->budget_5yp_cash,
                    'forecast_cost' => $request->forecast_cost,
                    'forecast_cash' => $request->forecast_cash,
                    'start_year' => $request->start_year,
                    'num_of_year_budget' => $request->num_of_year_budget,
                    'total_cash' => $request->total_cash,
                    'total_cost' => $request->total_cost,
                    'cost_remaining' => $request->cost_remaining,
                    'budget_car' => $request->budget_car,
                    'bc_budget' => $request->bc_budget,
                    'project_id' => $request->id,
                    'cash_remaining' => $request->cash_remaining,
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

                if (preg_match('/^(cash|cost)_(1[0-2]|[1-9])_(\d{4})$/', $key, $match)) {
                    $type = $match[1]; // 'cash' or 'cost'
                    $month = $match[2];
                    $year = $match[3]; // e.g. '2025'

                    $yearlyId = CashCostYearly::where('year',$year)->where('type',$type)->where('project_id',$request->id)->first();
                    $costCashMonthly = CashCostMonthly::where('yearly_id', $yearlyId->id)->where('month', $month)->where('type', $type)->get();
                    if(sizeof($costCashMonthly) > 0){
                        foreach ($costCashMonthly as $data) {
                            $data->amount = $value;
                            $data->save();
                        }
                    } else {
                        CashCostMonthly::create([
                            'yearly_id' => $yearlyId->id,
                            'month' => $month,
                            'amount' => $value,
                            'type' => $type,
                        ]);
                    }
                }
            }

            DB::commit();
            $year = $request->year_period ?? $project->year_period;
            $projectService->updateChart($year);
            $projectService->updateBudgets($year, $id);
            $projectService->updateBudgetList($year);
            return response()->json([
                'success' => true,
                'message' => 'Budget updated successfully',
                'data' => true
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'data' => false
            ]);
        }
    }

    public function destroy(Request $request){
        $projectService = new ProjectsService();
        $ids = $request->input('ids'); // expects an array: ['1', '2', '3']

        if (!is_array($ids)) {
            return response()->json(['message' => 'Invalid ids.'], 400);
        }

        $projects = Projects::with(['budgets', 'cashCostYearlies', 'budgetCyclePeriod'])->whereIn('id', $ids)->get();

        $lockedIds = $projects->reject(fn ($project) => $projectService->isLatestVersion($project))->pluck('id')->values();
        if ($lockedIds->isNotEmpty()) {
            return response()->json([
                'message' => 'Cannot delete projects belonging to a locked (non-latest) budget cycle version.',
                'locked_ids' => $lockedIds,
            ], 423);
        }

        foreach ($projects as $project) {
            $project->budgets()->delete();
            $project->cashCostYearlies()->delete();
            $project->delete();
        }


        $projectService->updateBudgetList($request->year);
        return response()->json(['message' => 'Budgets deleted.']);
    }

    public function finalize($year, $version){
        try {
            if(!isset($version)){
                $version = 0;
            }
            $budgetPeriod = BudgetCyclePeriod::where('start_year', $year)->where('version', $version)->firstOrFail();
            $budgetPeriod->approval_status = ApprovalStatus::SUBMISSION;

            $budgetPeriod->save();
            $projectService = new ProjectsService();
            $projectService->duplicateDataFinalize($budgetPeriod->id);
            $projectService->updateBudgetList($year);
            return response()->json(['message' => 'Budgets finalize.','status' => 200]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    public function getBudgetByYearAndVersion($year, $version){
        try {
            $projectService = new ProjectsService;
            $budgets = $projectService->getBudgetsByYear($year, null, $version);
            $versions =  BudgetCyclePeriod::where('start_year',$year)->get();
            $latestVersion = $versions->max('version');

            return response()->json([
                'status' => 200,
                'year' => $year,
                'version' => $version,
                'budgets' => $budgets,
                'latestVersion' => $latestVersion
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    public function getVersionList($year){
        try {
            $projectService = new ProjectsService;
            $versions = $projectService->getVersionListByYear($year);
            return response()->json([
                'status' => 200,
                'year' => $year,
                'data' => $versions,
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }
}
