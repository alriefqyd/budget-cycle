<?php

namespace App\Console\Commands;

use App\Exports\BudgetCyclePlanExport;
use App\Models\BudgetAutoExport;
use App\Models\BudgetCyclePeriod;
use App\Services\ProjectsService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;

// Runs every minute (see bootstrap/app.php's ->withSchedule()), but each
// period only actually gets a fresh export once its own configured interval
// has elapsed since auto_export_last_run_at — the per-minute tick is just
// how often we check, not how often a file gets written.
class RunAutoExports extends Command
{
    protected $signature = 'exports:run-auto';

    protected $description = 'Generate scheduled Excel backups for budget cycle periods with auto-backup enabled';

    // Oldest exports beyond this count (per period) are deleted every run,
    // so a period left with auto-backup on indefinitely doesn't grow
    // storage/app/private/auto_exports without bound.
    const KEEP_PER_PERIOD = 20;

    public function handle(): void
    {
        $periods = BudgetCyclePeriod::where('auto_export_enabled', true)->get();

        foreach ($periods as $period) {
            $interval = $period->auto_export_interval_minutes ?: 15;
            $due = !$period->auto_export_last_run_at
                || $period->auto_export_last_run_at->addMinutes($interval)->isPast();

            if (!$due) {
                continue;
            }

            try {
                $this->runForPeriod($period);
            } catch (\Throwable $e) {
                Log::error("Auto-export failed for budget cycle period {$period->id} ({$period->start_year} v{$period->version}): " . $e->getMessage());
            }
        }
    }

    private function runForPeriod(BudgetCyclePeriod $period): void
    {
        $projectService = new ProjectsService();
        $budgets = $projectService->getBudgetsByYear($period->start_year, null, $period->version);

        $filename = sprintf(
            'auto_exports/%d/v%d/Budget-Cycle-%d-v%d-%s.xlsx',
            $period->start_year,
            $period->version,
            $period->start_year,
            $period->version,
            now()->format('Ymd-His')
        );

        Excel::store(new BudgetCyclePlanExport($budgets, $period->start_year), $filename, 'local');

        BudgetAutoExport::create([
            'budget_cycle_period_id' => $period->id,
            'disk_path' => $filename,
            'file_size' => Storage::disk('local')->size($filename),
            'created_at' => now(),
        ]);

        $this->pruneOldExports($period);

        $period->auto_export_last_run_at = now();
        $period->save();

        $this->info("Auto-export written for {$period->start_year} v{$period->version}: {$filename}");
    }

    private function pruneOldExports(BudgetCyclePeriod $period): void
    {
        $stale = BudgetAutoExport::where('budget_cycle_period_id', $period->id)
            ->orderByDesc('id')
            ->skip(self::KEEP_PER_PERIOD)
            ->take(PHP_INT_MAX)
            ->get();

        foreach ($stale as $old) {
            // Delete the DB row first: if it fails, the file is still there
            // and the row still points to it (safe, just retried next run).
            // Deleting storage first and having the row-delete fail would
            // orphan the row against a now-missing file — exactly the
            // mismatch that made downloadAutoExport() 500 in production.
            try {
                $old->delete();
                Storage::disk('local')->delete($old->disk_path);
            } catch (\Throwable $e) {
                Log::error("Failed to prune auto-export #{$old->id} ({$old->disk_path}): " . $e->getMessage());
            }
        }
    }
}
