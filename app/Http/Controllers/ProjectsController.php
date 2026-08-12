<?php

namespace App\Http\Controllers;

use App\ApprovalStatus;
use App\Events\BudgetListUpdated;
use App\Events\BudgetUpdated;
use App\Exports\BudgetCyclePlanExport;
use App\Imports\MaterialCategoryImport;
use App\Imports\MaterialImport;
use App\Imports\ProjectsImport;
use App\Models\ActivityLog;
use App\Models\BudgetCyclePeriod;
use App\Models\BudgetSetting;
use App\Models\CashCostMonthly;
use App\Models\CashCostYearly;
use App\Models\ProjectChangeLog;
use App\Models\Projects;
use App\Services\ProjectsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;


class ProjectsController extends Controller
{
    // Debugbar is require-dev only — not installed in production — so this
    // must never reference the class/facade directly (that's a fatal "class
    // not found" in prod). Checking the container binding is safe either way.
    private function disableDebugbarIfPresent(): void
    {
        if (app()->bound('debugbar')) {
            app('debugbar')->disable();
        }
    }

    // $changes is the post-save Model::getChanges() result (already excludes
    // untouched columns); $original is the pre-save attribute snapshot
    // (Model::getOriginal(), captured before ->update() was called) used to
    // look up the "before" value for each changed key.
    private static array $unloggedFields = ['id', 'created_at', 'updated_at', 'project_id', 'budget_cycle_period_id'];

    // Find & Replace is scoped to plain text columns on `projects` only —
    // never the cash/cost/commitment figures (those live on a different
    // table with different upsert-by-year semantics, and "substring replace"
    // isn't a meaningful operation on a number anyway).
    private const FIND_REPLACE_FIELDS = [
        'project_title', 'note', 'status_progress', 'project_manager', 'project_control',
        'directorate', 'owner_area', 'type_of_investment', 'category',
        'risk_residual', 'risk_forecast', 'fm_new',
    ];

    // Returns the field => ['old' => ..., 'new' => ...] map of everything it
    // actually logged (post unloggedFields/no-op filtering), so callers can
    // reuse the exact same diff for an ActivityLog's `properties` instead of
    // recomputing it separately.
    private function logProjectChanges(Projects $project, array $original, array $changes): array
    {
        $userId = auth()->id();
        $logged = [];
        foreach ($changes as $field => $newValue) {
            if (in_array($field, self::$unloggedFields, true)) {
                continue;
            }
            $oldValue = $original[$field] ?? null;
            if ($oldValue == $newValue) {
                continue;
            }
            ProjectChangeLog::create([
                'project_id' => $project->id,
                'user_id' => $userId,
                'field' => $field,
                'old_value' => $oldValue,
                'new_value' => $newValue,
            ]);
            $logged[$field] = ['old' => $oldValue, 'new' => $newValue];
        }

        return $logged;
    }

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

    // Simplified, PM-filterable forecast view. Reuses the same data source as
    // show() (getBudgetsByYear) so it always reflects the latest version —
    // this is intentionally a thinner *view* over the same data, not a
    // separate data path, so it can never drift out of sync with the main grid.
    public function myForecast($year)
    {
        $projectService = new ProjectsService;
        $budgets = $projectService->getBudgetsByYear($year, null);
        $versions = $projectService->getVersionListByYear($year);
        $budgetVersion = BudgetCyclePeriod::where('start_year', $year)->orderBy('version', 'desc')->first();
        return Inertia::render('Budgets/MyForecast', [
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
            ActivityLog::record('project.created', "Created project \"{$data->project_title}\" ({$data->sap_code}) for {$data->year_period}", $data);

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
                ActivityLog::record('project.duplicated', "Duplicated project \"{$project->project_title}\" ({$project->sap_code}) for {$project->year_period}", $project);
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
        // A bulk import runs ~10 queries per row (project + cash/cost yearly
        // rows + budget setting), and in local/dev Debugbar retains every
        // query's SQL/bindings/backtrace for the whole request — for a few
        // hundred rows that alone exhausts the default 128M memory_limit
        // well before the import logic itself does anything heavy.
        $this->disableDebugbarIfPresent();
        ini_set('memory_limit', '512M');

        $projectService = new ProjectsService();
        $file = $request->file('file');
        if ($request->hasFile('file')) {
            Log::info('Starting import projects...');
            try {
                $budgetCycle = $projectService->saveBudgetCyclePeriod($request, ApprovalStatus::APPROVED);
                $importClass = new ProjectsImport($request->year, false, $budgetCycle->id);
                Excel::import($importClass, $file);

                if ($importClass->getProcessedCount() === 0) {
                    $rejected = $importClass->getRejectedSapCodes();
                    $budgetCycle->delete();
                    return response()->json([
                        'message' => $rejected
                            ? 'No valid rows found in file. SAP codes must start with "C" followed by a digit — found: ' . implode(', ', array_slice($rejected, 0, 10))
                            : 'No valid rows found in file. The file may be empty or missing a SAP Code column.',
                    ], 422);
                }

                ActivityLog::record('project.imported', "Imported budget file \"{$file->getClientOriginalName()}\" for {$request->year}", $budgetCycle);
                $projectService->updateBudgetList($request->year);
                $projectService->updateChart($request->year);
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
        if ($request->user()->isViewer()) {
            abort(403, 'Viewers are not allowed to export data.');
        }
        try {
            $projectService = new ProjectsService;
            $budgets = $projectService->getBudgetsByYear($request->year, null);
            return Excel::download(new BudgetCyclePlanExport($budgets, $request->year), 'Budget-Cycle-'.$request->year.'.xlsx');
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        }
    }

    public function uploadProject(Request $request){
        // See upload() above — same per-row query volume, same Debugbar
        // memory blow-up risk.
        $this->disableDebugbarIfPresent();
        ini_set('memory_limit', '512M');

        $file = $request->file('file');

        if (!$request->hasFile('file')) {
            Log::info('No file uploaded');
            return response()->json(['message' => 'No file uploaded'], 400);
        }

        Log::info('Starting import projects...');
        $dryRun = $request->boolean('dry_run');
        DB::beginTransaction();
        try {
            $budgetPeriod = BudgetCyclePeriod::where('start_year', $request->year)
                ->where('version', $request->version)
                ->firstOrFail();

            $latestVersion = BudgetCyclePeriod::where('start_year', $request->year)->max('version');
            if ((int) $budgetPeriod->version !== (int) $latestVersion) {
                DB::rollBack();
                return response()->json(['message' => 'Cannot import into a locked (non-latest) budget cycle version.'], 423);
            }
            if ($budgetPeriod->approval_status === ApprovalStatus::FINAL->value) {
                DB::rollBack();
                return response()->json(['message' => 'This budget cycle version is locked and can no longer be imported into.'], 423);
            }

            $projectService = new ProjectsService;
            $importClass = new ProjectsImport($request->year, true, $budgetPeriod->id, $dryRun);
            Excel::import($importClass, $file);

            $importedSapCodes = $importClass->getImportedSapCodes();
            if ($importClass->getProcessedCount() === 0) {
                DB::rollBack();
                $rejected = $importClass->getRejectedSapCodes();
                $message = $rejected
                    ? 'No valid rows found in file. Aborted to avoid deleting all projects in this version. SAP codes must start with "C" followed by a digit — found: ' . implode(', ', array_slice($rejected, 0, 10))
                    : 'No valid rows found in file. Aborted to avoid deleting all projects in this version.';
                return response()->json(['message' => $message], 422);
            }

            $staleProjects = Projects::where('budget_cycle_period_id', $budgetPeriod->id)
                ->whereNotIn('sap_code', $importedSapCodes)
                ->get();

            foreach ($staleProjects as $project) {
                $project->cashCostYearlies()->delete();
                $project->budgets()->delete();
                $project->delete();
            }
            $deletedCount = $staleProjects->count();

            // Preview mode: roll back every write above (both the row
            // updates and the deletions) and just report what *would*
            // happen, so the frontend can show a real count before the user
            // confirms a destructive import instead of finding out after.
            if ($dryRun) {
                DB::rollBack();
                return response()->json([
                    'dry_run' => true,
                    'updated' => count($importedSapCodes),
                    'deleted' => $deletedCount,
                    'deleted_titles' => $staleProjects->pluck('project_title')->filter()->take(10)->values(),
                ]);
            }

            $projectService->updateBudgetList($request->year);
            $projectService->updateChart($request->year);

            ActivityLog::record(
                'project.imported',
                "Imported budget file \"{$file->getClientOriginalName()}\" into {$request->year} v{$request->version} — "
                    . count($importedSapCodes) . " row(s) updated, {$deletedCount} project(s) removed",
                $budgetPeriod
            );

            DB::commit();
            Log::info('Import project successful');
            return response()->json([
                'message' => "Import successful. {$deletedCount} project(s) not in the file were deleted from this version.",
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Import error: ' . $e->getMessage());
            return response()->json(['message' => $e->getMessage()], 500);
        }
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
            ActivityLog::record('project.created', "Added a new blank project row for {$request->year}", $data);
            $projectService->updateBudgetList($request->year);
            $projectService->updateChart($request->year);
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
            if ($projectService->isLocked($project)) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'This budget cycle version is locked and can no longer be edited.',
                    'data' => false
                ], 423);
            }
            $projectOriginal = $project->getOriginal();
            $project->update($request->all());

            $budget = $project->budgets;
            $budgetOriginal = [];
            if($budget){
                $budgetOriginal = $budget->getOriginal();
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

            $properties = $this->logProjectChanges($project, $projectOriginal, $project->getChanges());
            if ($budgetOriginal) {
                $properties += $this->logProjectChanges($project, $budgetOriginal, $budget->getChanges());
            }

            // Yearly cash/cost/commitment amounts live on CashCostYearly, not
            // Projects/BudgetSetting, so they're invisible to getChanges() above —
            // tracked separately here and folded into the same change log +
            // activity summary.
            $yearlyOriginal = [];
            $yearlyChanges = [];

            foreach ($request->all() as $key => $value) {
                if (preg_match('/^(cash|cost|commitment)_(\d{4})$/', $key, $matches)) {
                    $type = $matches[1]; // 'cash', 'cost', or 'commitment'
                    $year = $matches[2]; // e.g. '2025'

                    $costCashYearly = CashCostYearly::where('year', $year)->where('type', $type)->where('project_id', $request->id)->first();
                    $yearlyOriginal[$key] = $costCashYearly?->amount;
                    $yearlyChanges[$key] = $value;

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

            $properties += $this->logProjectChanges($project, $yearlyOriginal, $yearlyChanges);

            if ($properties) {
                ActivityLog::record(
                    'project.updated',
                    "Updated project \"{$project->project_title}\" ({$project->sap_code}): " . implode(', ', array_keys($properties)),
                    $project,
                    $properties
                );
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
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            DB::rollback();
            // The project this row pointed to no longer exists — most likely
            // it was removed by a re-import (which replaces rows with new
            // IDs) or a bulk delete that happened after this page was
            // loaded. The raw "No query results for model" message doesn't
            // tell the user what to actually do about it.
            return response()->json([
                'success' => false,
                'message' => 'This row no longer exists — it may have been removed or replaced by a more recent import. Please refresh the page and try again.',
                'data' => false
            ], 404);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'data' => false
            ]);
        }
    }

    // Excel-style "Find & Replace" across one text column, scoped to the
    // exact (year, version) the grid has open — never across other versions.
    // Same dry-run-then-confirm shape as uploadProject()'s import preview:
    // callers should show the dry-run count/preview to the user before
    // calling again with dry_run omitted.
    public function findReplace(Request $request){
        $validated = $request->validate([
            'year' => 'required',
            'version' => 'required',
            'field' => 'required|string|in:' . implode(',', self::FIND_REPLACE_FIELDS),
            'find' => 'required|string',
            'replace' => 'nullable|string',
        ]);
        $field = $validated['field'];
        $find = $validated['find'];
        $replace = $validated['replace'] ?? '';
        $matchCase = $request->boolean('match_case');
        $dryRun = $request->boolean('dry_run');

        try {
            $budgetPeriod = BudgetCyclePeriod::where('start_year', $request->year)
                ->where('version', $request->version)
                ->firstOrFail();

            $latestVersion = BudgetCyclePeriod::where('start_year', $request->year)->max('version');
            if ((int) $budgetPeriod->version !== (int) $latestVersion) {
                return response()->json(['message' => 'Cannot edit a locked (non-latest) budget cycle version.'], 423);
            }
            if ($budgetPeriod->approval_status === ApprovalStatus::FINAL->value) {
                return response()->json(['message' => 'This budget cycle version is locked and can no longer be edited.'], 423);
            }

            $projects = Projects::where('budget_cycle_period_id', $budgetPeriod->id)
                ->where($field, $matchCase ? 'LIKE BINARY' : 'LIKE', '%' . str_replace(['%', '_'], ['\\%', '\\_'], $find) . '%')
                ->get();

            $replaceIn = fn ($value) => $matchCase
                ? str_replace($find, $replace, $value ?? '')
                : str_ireplace($find, $replace, $value ?? '');

            if ($dryRun) {
                return response()->json([
                    'dry_run' => true,
                    'count' => $projects->count(),
                    'preview' => $projects->take(10)->map(fn ($p) => [
                        'sap_code' => $p->sap_code,
                        'project_title' => $p->project_title,
                        'before' => $p->$field,
                        'after' => $replaceIn($p->$field),
                    ]),
                ]);
            }

            DB::beginTransaction();
            $count = 0;
            foreach ($projects as $project) {
                $before = $project->$field;
                $after = $replaceIn($before);
                if ($after === $before) {
                    continue;
                }
                $project->$field = $after;
                $project->save();
                ProjectChangeLog::create([
                    'project_id' => $project->id,
                    'user_id' => auth()->id(),
                    'field' => $field,
                    'old_value' => $before,
                    'new_value' => $after,
                ]);
                $count++;
            }

            if ($count > 0) {
                ActivityLog::record(
                    'project.bulk_replaced',
                    "Find & replace on {$field}: \"{$find}\" \u{2192} \"{$replace}\" across {$count} project(s) in {$request->year} v{$request->version}",
                    $budgetPeriod,
                    ['field' => $field, 'find' => $find, 'replace' => $replace, 'count' => $count]
                );
            }

            DB::commit();

            $projectService = new ProjectsService();
            $projectService->updateBudgetList($request->year);

            return response()->json([
                'message' => "Replaced {$count} value(s).",
                'count' => $count,
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function history($id)
    {
        $logs = ProjectChangeLog::where('project_id', $id)
            ->with('user:id,name')
            ->orderByDesc('created_at')
            ->get();
        return response()->json([
            'success' => true,
            'data' => $logs,
        ]);
    }

    public function destroy(Request $request){
        $projectService = new ProjectsService();
        $ids = $request->input('ids'); // expects an array: ['1', '2', '3']

        if (!is_array($ids)) {
            return response()->json(['message' => 'Invalid ids.'], 400);
        }

        $projects = Projects::with(['budgets', 'cashCostYearlies', 'budgetCyclePeriod'])->whereIn('id', $ids)->get();

        $lockedIds = $projects->filter(fn ($project) => $projectService->isLocked($project))->pluck('id')->values();
        if ($lockedIds->isNotEmpty()) {
            return response()->json([
                'message' => 'Cannot delete projects belonging to a locked (non-latest) budget cycle version.',
                'locked_ids' => $lockedIds,
            ], 423);
        }

        foreach ($projects as $project) {
            ActivityLog::record('project.deleted', "Deleted project \"{$project->project_title}\" ({$project->sap_code}) from {$project->year_period}", $project);
            $project->budgets()->delete();
            $project->cashCostYearlies()->delete();
            $project->delete();
        }


        $projectService->updateBudgetList($request->year);
        $projectService->updateChart($request->year);
        return response()->json(['message' => 'Budgets deleted.']);
    }

    public function finalize($year, $version){
        try {
            if(!isset($version)){
                $version = 0;
            }
            $budgetPeriod = BudgetCyclePeriod::where('start_year', $year)->where('version', $version)->firstOrFail();

            $latestVersion = BudgetCyclePeriod::where('start_year', $year)->max('version');
            if ((int) $budgetPeriod->version !== (int) $latestVersion) {
                return response()->json(['message' => 'Only the latest budget cycle version can be finalized.'], 423);
            }
            if ($budgetPeriod->approval_status === ApprovalStatus::FINAL->value) {
                return response()->json(['message' => 'This budget cycle version is locked and can no longer be finalized.'], 423);
            }

            $budgetPeriod->approval_status = ApprovalStatus::SUBMISSION;

            $budgetPeriod->save();
            $projectService = new ProjectsService();
            $projectService->duplicateDataFinalize($budgetPeriod->id);
            $projectService->updateBudgetList($year);
            ActivityLog::record('budget.finalized', "Finalized budget cycle {$year} v{$version}", $budgetPeriod);
            return response()->json(['message' => 'Budgets finalize.','status' => 200]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    public function lock($year, $version){
        try {
            $budgetPeriod = BudgetCyclePeriod::where('start_year', $year)->where('version', $version)->firstOrFail();

            $latestVersion = BudgetCyclePeriod::where('start_year', $year)->max('version');
            if ((int) $budgetPeriod->version !== (int) $latestVersion) {
                return response()->json(['message' => 'Only the latest budget cycle version can be locked.'], 423);
            }
            if ($budgetPeriod->approval_status === ApprovalStatus::FINAL->value) {
                return response()->json(['message' => 'This budget cycle version is already locked.'], 423);
            }

            $budgetPeriod->approval_status = ApprovalStatus::FINAL;
            $budgetPeriod->save();

            $projectService = new ProjectsService();
            $projectService->updateBudgetList($year);
            ActivityLog::record('budget.locked', "Locked and approved budget cycle {$year} v{$version}", $budgetPeriod);
            return response()->json(['message' => 'Budget cycle locked and approved.', 'status' => 200]);
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
            $currentPeriod = $versions->firstWhere('version', (int) $version);

            return response()->json([
                'status' => 200,
                'year' => $year,
                'version' => $version,
                'budgets' => $budgets,
                'latestVersion' => $latestVersion,
                'approvalStatus' => $currentPeriod->approval_status ?? null,
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    public function compare(Request $request, $year){
        $projectService = new ProjectsService;
        $versions = $projectService->getVersionListByYear($year)->values();
        $latest = $versions->first();
        $previous = $versions->count() > 1 ? $versions->get(1) : $latest;

        $versionA = $request->query('version_a', $previous);
        $versionB = $request->query('version_b', $latest);

        $comparison = $projectService->compareVersions($year, $versionA, $versionB);

        return Inertia::render('Budgets/Compare', [
            'year' => $year,
            'versions' => $versions,
            'comparison' => $comparison,
        ]);
    }

    public function compareData(Request $request, $year){
        try {
            $projectService = new ProjectsService;
            $comparison = $projectService->compareVersions($year, $request->query('version_a'), $request->query('version_b'));

            return response()->json([
                'status' => 200,
                'comparison' => $comparison,
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    public function versionTrend($year){
        try {
            $projectService = new ProjectsService;
            $trend = $projectService->getVersionTrend($year);

            return response()->json([
                'status' => 200,
                'trend' => $trend,
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

    public function deleteVersion($year, $version){
        try {
            $budgetPeriod = BudgetCyclePeriod::where('start_year', $year)->where('version', $version)->firstOrFail();

            $totalVersions = BudgetCyclePeriod::where('start_year', $year)->count();
            if ($totalVersions <= 1) {
                return response()->json(['message' => 'Cannot delete the only version of this budget cycle.'], 423);
            }

            DB::transaction(function () use ($budgetPeriod, $year, $version) {
                $projects = $budgetPeriod->projects()->with(['cashCostYearlies.cashCostMonthly'])->get();
                ActivityLog::record('budget.version_deleted', "Deleted budget cycle {$year} v{$version} ({$projects->count()} project(s))", $budgetPeriod);
                foreach ($projects as $project) {
                    foreach ($project->cashCostYearlies as $yearly) {
                        $yearly->cashCostMonthly()->delete();
                    }
                    $project->cashCostYearlies()->delete();
                    $project->budgets()->delete();
                    $project->delete();
                }
                $budgetPeriod->delete();
            });

            $projectService = new ProjectsService();
            $projectService->updateBudgetList($year);
            $projectService->updateChart($year);

            $remainingVersions = BudgetCyclePeriod::where('start_year', $year)->orderBy('version', 'desc')->get();

            return response()->json([
                'status' => 200,
                'message' => 'Budget cycle version deleted.',
                'latestVersion' => $remainingVersions->max('version'),
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }
}
