<?php

namespace App\Http\Controllers;

use App\Models\CashCostYearly;
use App\Models\Projects;
use Illuminate\Http\Request;
use Inertia\Inertia;

class HomeController extends Controller
{
    public function index(){
        $year = date('Y') + 1;
        $dataChart = $this->getCashCostYearly($year);
        $dataChart5Yp = $this->getData5yp($year);
        $pieChart = $this->getProjectByType($year);

        return Inertia::render('Dashboard',
        [
            'dataChart' => $dataChart,
            'dataCostCash5yp' => $dataChart5Yp,
            'pieChart' => $pieChart,
        ]);
    }

    public function getData5yp($startYear){
        $costArr = [];
        $cashArr = [];
        $label = [];
        foreach (range($startYear, $startYear + 4) as $index => $year) {
            $cashPlan = Projects::with('cashCostYearlies')->where('year_period', $startYear)->get()->sum(function ($item) use ($year) {
                return $item->cashCostYearlies->where('type', 'cash')->where('year', $year)->sum('amount');
            });

            $costPlan = Projects::with('cashCostYearlies')->where('year_period', $startYear)->get()->sum(function ($item) use ($year) {
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

    public function getCashCostYearly($startYear)
    {
        $data = collect();
        $planArr = [];
        $totalPlan5yp = [];
        $totalApprove5yp = [];
        $approvedArr = [];
        $label = [];
        $lastYear = [150000000, 200281789, 194704553, 178882078, 104596538, 0];

        foreach (range($startYear - 1, $startYear + 4) as $index => $year) {
            $cashPlan = Projects::with('cashCostYearlies')
                ->where('year_period', $startYear)
                ->get()
                ->sum(function ($item) use ($year) {
                    return $item->cashCostYearlies
                        ->where('type', 'cash')
                        ->where('year', $year)
                        ->sum('amount');
                });

            $costPlan = Projects::with('cashCostYearlies')
                ->where('year_period', $startYear)
                ->get()
                ->sum(function ($item) use ($year) {
                    return $item->cashCostYearlies
                        ->where('type', 'cost')
                        ->where('year', $year)
                        ->sum('amount');
                });

            $plan = $cashPlan ? round($cashPlan / 1000000, 2) : 0;
            $approved = $lastYear[$index] ? round($lastYear[$index] / 1000000, 2) : 0;

            array_push($label, $year);
            array_push($planArr, $plan);
            array_push($approvedArr, $approved);
            array_push($totalPlan5yp, null);
            array_push($totalApprove5yp, null);
        }

        // Always push nulls at the end for chart spacing
        array_push($planArr, null);
        array_push($approvedArr, null);

        // Compute 5YP sums, excluding startYear-1 from approved total
        $plan5yp = array_sum($planArr);
        $approve5yp = 0;
        foreach ($approvedArr as $key => $value) {
            // Skip nulls and skip the first year (startYear - 1)
            if ($key === 0 || $value === null) continue;
            $approve5yp += $value;
        }

        array_push($totalApprove5yp, $approve5yp);
        array_push($totalPlan5yp, $plan5yp);
        array_push($label, '5YP');

        return [
            'label' => $label,
            'approved' => $approvedArr,
            'plan' => $planArr,
            'approved5yp' => $totalApprove5yp,
            'plan5yp' => $totalPlan5yp,
        ];
    }


    public function getProjectByType($year){
        $data = Projects::with('cashCostYearlies')->where('year_period',$year)->whereNot('status_progress','CAP')->get()->groupBy('status_progress')->map(function ($items, $key) use ($year) {
            return [
                'label' => $key,
                'value' => $items->count(),
                'budget' => number_format($items->sum(function ($item) use ($year) {
                    return $item->cashCostYearlies->where('type', 'cash')->where('year',$year)->sum('amount');
                }) / 1000000,2,'.',','), // Convert to millions
            ];
        })->values()->toArray();
        return $data;
    }
}
