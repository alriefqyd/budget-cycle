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
        $lastYear = [200281789,194704553,178882078,104596538,0];
        foreach (range($startYear, $startYear + 4) as $index => $year) {
            $cashPlan = Projects::with('cashCostYearlies')->where('year_period', $startYear)->get()->sum(function ($item) use ($year) {
                return $item->cashCostYearlies->where('type', 'cash')->where('year', $year)->sum('amount');
            });

            $costPlan = Projects::with('cashCostYearlies')->where('year_period', $startYear)->get()->sum(function ($item) use ($year) {
                return $item->cashCostYearlies->where('type', 'cost')->where('year', $year)->sum('amount');
            });

            // Round to 2 decimals instead of formatting
            // $approved = $approved ? round($approved / 1000000, 2) : 0;
            $plan = $cashPlan ? round($cashPlan / 1000000, 2) : 0;
            $approved = $lastYear[$index] ? round($lastYear[$index] / 1000000, 2) : 0;

            array_push($label, $year);
            array_push($planArr, $plan);
            array_push($approvedArr, $approved);
            array_push($totalPlan5yp, null);
            array_push($totalApprove5yp, null);
        }

        array_push($planArr,null);
        array_push($approvedArr, null);


        // counting cash 5YP
        /* $cash5yp = Projects::with(['budgets','cashCostYearlies'])
            ->where('year_period', $startYear)
            ->get()
            ->reduce(function ($carry, $item) {
                return $carry + ($item->budgets->total_cash ?? 0);
            }, 0);

        $cost5yp = Projects::with('budgets')->where('year_period', $startYear)->get()
            ->reduce(function ($i, $item) {
                return $i + $item->budgets?->total_cost ?? 0;
            });

        $cash5yp = $cash5yp ? round($cash5yp / 1000000, 2) : 0;
        $cost5yp = $cost5yp ? round($cost5yp / 1000000, 2) : 0; */

        $plan5yp = array_sum($planArr);
        $approve5yp = array_sum($approvedArr);

        array_push($totalApprove5yp,$approve5yp);
        array_push($totalPlan5yp,$plan5yp);
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
        // budget year cash exist
        // add pie chart by budget and category
        $data = Projects::with('cashCostYearlies')->where('year_period',$year)->whereNot('status_progress','CAP')->whereHas('cashCostYearlies', function ($query) use ($year) {
            return $query->where('type', 'cash')->where('year', $year)->whereNotNull('amount')->where('amount','>',0);
        })->get()->groupBy('status_progress')->map(function ($items, $key) {
            return [
                'label' => $key,
                'value' => $items->count(),
                'budget' => $items->sum(function ($item) {
                    return $item->cashCostYearlies->where('type', 'cash')->sum('amount');
                }) / 1000000, // Convert to millions
            ];
        })->values()->toArray();
        return $data;
    }
}
