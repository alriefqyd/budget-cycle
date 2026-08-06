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
        // The dashboard follows next year's cycle — capital budgeting for a
        // given year is planned/forecasted during the prior calendar year.
        $year = date('Y') + 1;
        $dataChart = $this->getCashCostYearly($year);
        $dataChart5Yp = $this->getData5yp($year);
        $pieChart = $this->getProjectByType($year);
        $floatingChart = $this->getProjectByDirectorate($year);
        $directorateTrend = $this->getDirectorateTrend($year);

        $versions = BudgetCyclePeriod::where('start_year', $year)->get();
        $defaultVersion = $versions->max('version');

        return Inertia::render('Dashboard',
        [
            'dataChart' => $dataChart,
            'dataCostCash5yp' => $dataChart5Yp,
            'pieChart' => $pieChart,
            'floatingChart' => $floatingChart,
            'directorateTrend' => $directorateTrend,
            'versions' => $versions,
            'defaultVersion' => $defaultVersion,
            'year' => $year,
        ]);
    }

    public function getDashboardByVersion(Request $request){
        $year = $request->year;
        $version = $request->version;
        $dataChart = $this->getCashCostYearly($year, $version);
        $dataChart5Yp = $this->getData5yp($year, $version);
        $pieChart = $this->getProjectByType($year, $version);
        $floatingChart = $this->getProjectByDirectorate($year, $version);
        $directorateTrend = $this->getDirectorateTrend($year, $version);

        return response()->json([
            'dataChart' => $dataChart,
            'dataCostCash5yp' => $dataChart5Yp,
            'pieChart' => $pieChart,
            'floatingChart' => $floatingChart,
            'directorateTrend' => $directorateTrend,
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
        $lastYear = [150000000, 200281789, 194704553, 178882078, 104596538, 0];

        $latestVersion = $version ?? BudgetCyclePeriod::where('start_year',$startYear)->max('version');
        $projects = Projects::with(['cashCostYearlies','budgetCyclePeriod'])
            ->whereHas('budgetCyclePeriod', function ($query) use ($latestVersion) {
                $query->where('version',$latestVersion);
            })
            ->where('year_period', $startYear)
            ->get();

        foreach (range($startYear - 1, $startYear + 4) as $index => $year) {
            $cashPlan = $projects->sum(function ($item) use ($year) {
                return $item->cashCostYearlies
                    ->where('type', 'cash')
                    ->where('year', $year)
                    ->sum('amount');
            });

            $plan = $cashPlan ? round($cashPlan / 1000000, 2) : 0;
            $approved = $lastYear[$index] ? round($lastYear[$index] / 1000000, 2) : 0;

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
            return $query->where('year', $year)->whereNotNull('amount')->where('amount','>',0);
        })->get()->groupBy('status_progress')->map(function ($items, $key) use ($year) {    return [
                'label' => $key,
                'value' => $items->count(),
                'budget' => number_format($items->sum(function ($item) use ($year) {
                    return $item->cashCostYearlies->where('type', 'cash')->where('year',$year)->sum('amount');
                }) / 1000000,2,'.',','), // Convert to millions
            ];
        })->values()->toArray();
        return $data;
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
