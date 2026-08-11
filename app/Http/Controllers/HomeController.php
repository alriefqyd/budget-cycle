<?php

namespace App\Http\Controllers;

use App\Models\BudgetCyclePeriod;
use App\Models\CashCostYearly;
use App\Models\Projects;
use Illuminate\Http\Request;
use Inertia\Inertia;

class HomeController extends Controller
{
    public function index(){
        // "Latest period" = the most recent budget cycle that actually has
        // projects in it, not a date computation — a hardcoded date('Y')+1
        // drifted out of sync with reality once periods could be created for
        // any year, and an empty/leftover period (e.g. created then never
        // used) shouldn't outrank one with real data just for having a
        // higher start_year.
        $year = BudgetCyclePeriod::whereHas('projects')->max('start_year') ?? (date('Y') + 1);
        $availablePeriods = BudgetCyclePeriod::whereHas('projects')->select('start_year')->distinct()->orderByDesc('start_year')->pluck('start_year');

        $versions = BudgetCyclePeriod::where('start_year', $year)->get();
        $defaultVersion = $versions->max('version');

        // Resolved once above and threaded through every chart method below
        // (each accepts an optional $version override) — otherwise every one
        // of these independently re-ran the same "latest version for this
        // year" query when $version was omitted, turning one dashboard load
        // into 7 duplicate BudgetCyclePeriod queries for the same value.
        $dataChart = $this->getCashCostYearly($year, $defaultVersion);
        $dataChart5Yp = $this->getData5yp($year, $defaultVersion);
        $pieChart = $this->getProjectByType($year, $defaultVersion);
        $floatingChart = $this->getProjectByDirectorate($year, $defaultVersion);
        $directorateTrend = $this->getDirectorateTrend($year, $defaultVersion);
        $dataByType = $this->getBudgetByTypeOfInvestment($year, $defaultVersion);
        $dataByCategory = $this->getBudgetByCategory($year, $defaultVersion);

        return Inertia::render('Dashboard',
        [
            'dataChart' => $dataChart,
            'dataCostCash5yp' => $dataChart5Yp,
            'pieChart' => $pieChart,
            'floatingChart' => $floatingChart,
            'directorateTrend' => $directorateTrend,
            'dataByType' => $dataByType,
            'dataByCategory' => $dataByCategory,
            'versions' => $versions,
            'defaultVersion' => $defaultVersion,
            'year' => $year,
            'availablePeriods' => $availablePeriods,
        ]);
    }

    public function getDashboardByVersion(Request $request){
        $year = $request->year;

        // Recomputed here (not just on initial page load) so switching the
        // Period dropdown can refresh the Version dropdown's options in the
        // same round trip, without a second request. Also doubles as the
        // "latest version" resolution below, so an omitted $request->version
        // doesn't make every chart method below re-run this same query.
        $versions = BudgetCyclePeriod::where('start_year', $year)->get();
        $defaultVersion = $versions->max('version');
        $version = $request->version ?? $defaultVersion;

        $dataChart = $this->getCashCostYearly($year, $version);
        $dataChart5Yp = $this->getData5yp($year, $version);
        $pieChart = $this->getProjectByType($year, $version);
        $floatingChart = $this->getProjectByDirectorate($year, $version);
        $directorateTrend = $this->getDirectorateTrend($year, $version);
        $dataByType = $this->getBudgetByTypeOfInvestment($year, $version);
        $dataByCategory = $this->getBudgetByCategory($year, $version);

        return response()->json([
            'dataChart' => $dataChart,
            'dataCostCash5yp' => $dataChart5Yp,
            'pieChart' => $pieChart,
            'floatingChart' => $floatingChart,
            'directorateTrend' => $directorateTrend,
            'dataByType' => $dataByType,
            'dataByCategory' => $dataByCategory,
            'versions' => $versions,
            'defaultVersion' => $defaultVersion,
            'year' => $year,
        ]);
    }

    public function getDirectorateTrend($startYear, $version = null){
        $latestVersion = $version ?? BudgetCyclePeriod::where('start_year', $startYear)->max('version');
        $years = range($startYear, $startYear + 4);

        $projects = Projects::with(['cashCostYearlies', 'budgetCyclePeriod'])
            ->whereHas('budgetCyclePeriod', function ($query) use ($latestVersion) {
                $query->where('version', $latestVersion);
            })
            ->where('year_period', $startYear)
            ->whereNot('status_progress', 'CAP')
            ->get()
            ->groupBy(function ($project) {
                return $project->owner_area ?: 'Unassigned';
            });

        $series = $projects->map(function ($items) use ($years) {
            return collect($years)->map(function ($year) use ($items) {
                $amount = $items->sum(function ($item) use ($year) {
                    return $item->cashCostYearlies
                        ->where('type', 'cash')
                        ->where('year', (string) $year)
                        ->sum('amount');
                });
                return round($amount / 1000000, 2);
            })->toArray();
        });

        return [
            'years' => $years,
            'series' => $series,
        ];
    }

    public function getData5yp($startYear, $version = null){
        $costArr = [];
        $cashArr = [];
        $label = [];

        $latestVersion = $version ?? BudgetCyclePeriod::where('start_year',$startYear)->max('version');

        foreach (range($startYear, $startYear + 4) as $index => $year) {
            $cashPlan = Projects::with(['cashCostYearlies'])
                ->whereHas('budgetCyclePeriod', function ($query) use ($latestVersion) {
                    $query->where('version',$latestVersion);
                })->where('year_period', $startYear)->get()->sum(function ($item) use ($year) {
                return $item->cashCostYearlies->where('type', 'cash')->where('year', $year)->sum('amount');
            });

            $costPlan = Projects::with(['cashCostYearlies','budgetCyclePeriod'])->whereHas('budgetCyclePeriod', function ($query) use ($latestVersion) {
                $query->where('version',$latestVersion);
            })->where('year_period', $startYear)->get()->sum(function ($item) use ($year) {
                return $item->cashCostYearlies->where('type', 'cost')->where('year', $year)->sum('amount');
            });

            // Round to 2 decimals instead of formatting
            $cash = $cashPlan ? round($cashPlan / 1000000, 2) : 0;
            $cost = $costPlan ? round($costPlan / 1000000, 2) : 0;

            array_push($label, $year);
            array_push($costArr, $cost);
            array_push($cashArr, $cash);
        }

        return [
            'label' => $label,
            'cost' => $costArr,
            'cash' => $cashArr,
        ];
    }

    public function getCashCostYearly($startYear, $version = null)
    {
        $planArr = [];
        $totalPlan5yp = [];
        $totalApprove5yp = [];
        $approvedArr = [];
        $label = [];

        $latestVersion = $version ?? BudgetCyclePeriod::where('start_year',$startYear)->max('version');
        $projects = Projects::with(['cashCostYearlies','budgetCyclePeriod'])
            ->whereHas('budgetCyclePeriod', function ($query) use ($latestVersion) {
                $query->where('version',$latestVersion);
            })
            ->where('year_period', $startYear)
            ->get();

        // "Prior Cycle" is meant to be the actual previous budget cycle's own
        // plan, for a real comparison. Check for a real BudgetCyclePeriod
        // first (rather than assuming by year number) so that if 2025 data
        // ever gets backfilled into the DB, it's picked up automatically
        // instead of silently staying on the fixed line below forever. Only
        // 2025 (which predates this system and was never digitized) is
        // allowed to fall back to that fixed reference line — any other
        // missing prior year genuinely has no data yet and should show as a
        // real zero, not borrow an unrelated year's numbers.
        $priorCycleStartYear = $startYear - 1;
        $priorCycleLatestVersion = BudgetCyclePeriod::where('start_year', $priorCycleStartYear)->max('version');
        if ($priorCycleLatestVersion !== null) {
            $priorCycleProjects = Projects::with(['cashCostYearlies','budgetCyclePeriod'])
                ->whereHas('budgetCyclePeriod', function ($query) use ($priorCycleLatestVersion) {
                    $query->where('version', $priorCycleLatestVersion);
                })
                ->where('year_period', $priorCycleStartYear)
                ->get();
        } elseif ($priorCycleStartYear == 2025) {
            $lastYear = [150000000, 200281789, 194704553, 178882078, 104596538, 0];
            $priorCycleProjects = null;
        } else {
            $priorCycleProjects = collect();
        }

        $sumCashForYear = function ($projectsCollection, $year) {
            return $projectsCollection->sum(function ($item) use ($year) {
                return $item->cashCostYearlies
                    ->where('type', 'cash')
                    ->where('year', $year)
                    ->sum('amount');
            });
        };

        foreach (range($startYear - 1, $startYear + 4) as $index => $year) {
            $cashPlan = $sumCashForYear($projects, $year);
            $plan = $cashPlan ? round($cashPlan / 1000000, 2) : 0;

            if ($priorCycleProjects !== null) {
                $priorCash = $sumCashForYear($priorCycleProjects, $year);
                $approved = $priorCash ? round($priorCash / 1000000, 2) : 0;
            } else {
                $approved = $lastYear[$index] ? round($lastYear[$index] / 1000000, 2) : 0;
            }

            $label[] = $year;
            $planArr[] = $plan;
            $approvedArr[] = $approved;
            $totalPlan5yp[] = null;
            $totalApprove5yp[] = null;
        }

        // Always push nulls at the end for chart spacing
        $planArr[] = null;
        $approvedArr[] = null;

        $plan5yp = array_sum($planArr);
        $approve5yp = array_sum($approvedArr);

        $totalApprove5yp[] = $approve5yp;
        $totalPlan5yp[] = $plan5yp;
        $label[] = '5YP';

        return [
            'label' => $label,
            'approved' => $approvedArr,
            'plan' => $planArr,
            'approved5yp' => $totalApprove5yp,
            'plan5yp' => $totalPlan5yp,
            'year' => $startYear
        ];
    }


    public function getProjectByType($year, $version = null){
        $latestVersion = $version ?? BudgetCyclePeriod::where('start_year',$year)->max('version');
        $data = Projects::with(['cashCostYearlies','budgetCyclePeriod'])->whereHas('budgetCyclePeriod', function ($query) use ($latestVersion) {
            $query->where('version',$latestVersion);
        })->where('year_period',$year)->whereNot('status_progress','CAP')->whereHas('cashCostYearlies', function ($query) use ($year) {
            // Must match the 'cash' type summarizeGroup() sums below — without
            // this, a project with only a cost/commitment amount > 0 for the
            // year (and $0 cash) still gets counted here, making `value`
            // (project count) and `budget` (cash sum) describe different sets.
            return $query->where('type', 'cash')->where('year', $year)->whereNotNull('amount')->where('amount','>',0);
        })->get()->groupBy('status_progress')->map(function ($items, $key) use ($year) {
            return $this->summarizeGroup($key, $items, $year);
        })->values()->toArray();
        return $data;
    }

    public function getBudgetByTypeOfInvestment($year, $version = null){
        $latestVersion = $version ?? BudgetCyclePeriod::where('start_year',$year)->max('version');
        $data = Projects::with(['cashCostYearlies','budgetCyclePeriod'])->whereHas('budgetCyclePeriod', function ($query) use ($latestVersion) {
            $query->where('version',$latestVersion);
        })->where('year_period',$year)->whereNot('status_progress','CAP')->whereHas('cashCostYearlies', function ($query) use ($year) {
            // Must match the 'cash' type summarizeGroup() sums below — without
            // this, a project with only a cost/commitment amount > 0 for the
            // year (and $0 cash) still gets counted here, making `value`
            // (project count) and `budget` (cash sum) describe different sets.
            return $query->where('type', 'cash')->where('year', $year)->whereNotNull('amount')->where('amount','>',0);
        })->get()->groupBy(function ($project) {
            return $project->type_of_investment ?: 'Unspecified';
        })->map(function ($items, $key) use ($year) {
            return $this->summarizeGroup($key, $items, $year);
        })->values()->toArray();
        return $data;
    }

    public function getBudgetByCategory($year, $version = null){
        $latestVersion = $version ?? BudgetCyclePeriod::where('start_year',$year)->max('version');
        $data = Projects::with(['cashCostYearlies','budgetCyclePeriod'])->whereHas('budgetCyclePeriod', function ($query) use ($latestVersion) {
            $query->where('version',$latestVersion);
        })->where('year_period',$year)->whereNot('status_progress','CAP')->whereHas('cashCostYearlies', function ($query) use ($year) {
            // Must match the 'cash' type summarizeGroup() sums below — without
            // this, a project with only a cost/commitment amount > 0 for the
            // year (and $0 cash) still gets counted here, making `value`
            // (project count) and `budget` (cash sum) describe different sets.
            return $query->where('type', 'cash')->where('year', $year)->whereNotNull('amount')->where('amount','>',0);
        })->get()->groupBy(function ($project) {
            return $project->category ?: 'Unspecified';
        })->map(function ($items, $key) use ($year) {
            return $this->summarizeGroup($key, $items, $year);
        })->values()->toArray();
        return $data;
    }

    // Shared by getProjectByType/getBudgetByTypeOfInvestment/getBudgetByCategory:
    // count + cash budget (in millions) for one group of projects. `budget` is
    // returned as a plain float (not number_format's comma-thousands string) —
    // the frontend does Number(item.budget), which turns into NaN the moment a
    // group's total crosses 1,000 million and gets a thousands separator.
    private function summarizeGroup($label, $items, $year){
        $budget = $items->sum(function ($item) use ($year) {
            return $item->cashCostYearlies->where('type', 'cash')->where('year', $year)->sum('amount');
        });
        return [
            'label' => $label,
            'value' => $items->count(),
            'budget' => round($budget / 1000000, 2),
        ];
    }

    public function getProjectByDirectorate($year, $version = null)
    {
        $arrLabel = [];
        $arrBudget = [];
        $arrCount = [];
        $latestVersion = $version ?? BudgetCyclePeriod::where('start_year',$year)->max('version');

        $data = Projects::with(['cashCostYearlies','budgetCyclePeriod'])
            ->where('year_period', $year)
            ->whereHas('budgetCyclePeriod', function ($query) use ($latestVersion) {
                $query->where('version',$latestVersion);
            })
            ->whereNot('status_progress', 'CAP')
            ->whereHas('cashCostYearlies', function ($query) use ($year) {
                return $query->where('year', $year)
                    ->where('type', 'cash')
                    ->whereNotNull('amount')
                    ->where('amount', '>', 0);
            })
            ->get()
            ->groupBy('owner_area')
            ->map(function ($items, $key) use ($year) {
                $budget = $items->sum(function ($item) use ($year) {
                    return $item->cashCostYearlies
                        ->where('type', 'cash')
                        ->where('year', $year)
                        ->sum('amount');
                });
                return [
                    'label'  => $key,
                    'budget' => $budget, // keep raw for sorting
                    'count'  => $items->count(),
                ];
            })
            ->sortByDesc('budget') // sort from biggest to smallest
            ->values();

        // Now push into your arrays and format budget
        foreach ($data as $row) {
            $arrLabel[]  = $row['label'];
            $arrBudget[] = number_format($row['budget'] / 1000000, 2, '.', ',');
            $arrCount[]  = $row['count'];
        }

        // Add total
        $arrLabel[]  = 'Total';
        $arrBudget[] = number_format(array_sum(array_column($data->toArray(), 'budget')) / 1000000, 2, '.', ',');

        return [
            'label'  => $arrLabel,
            'budget' => $arrBudget,
            'count'  => $arrCount,
        ];
    }

}
