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
        return Inertia::render('Dashboard',
        [
            'dataChart' => $dataChart,
        ]);
    }

    public function getCashCostYearly($startYear)
    {
        $data = collect();

        $cash5yp = Projects::with('budgets')
            ->where('year_period', $startYear - 1)
            ->get()
            ->reduce(function ($carry, $item) {
                return $carry + ($item->budgets->total_cash ?? 0);
            }, 0);

        $cost5yp = Projects::with('budgets')->where('year_period', $startYear - 1)->get()
            ->reduce(function ($i, $item) {
                return $i + $item->budgets?->total_cost ?? 0;
            });

        $cash5yp = $cash5yp ? round($cash5yp / 1000000, 2) : 0;
        $cost5yp = $cost5yp ? round($cost5yp / 1000000, 2) : 0;

        $data->push([
            'year' => '5YP',
            'approved' => $cash5yp,
            'plan' => $cost5yp,
        ]);

        $lastYear = [200281789,194704553,178882078,104596538,0,0];
        foreach (range($startYear, $startYear + 5) as $index => $year) {
            $approved = Projects::with('cashCostYearlies')->where('year_period', $startYear)->get()->sum(function ($item) use ($year) {
                return $item->cashCostYearlies->where('type', 'cash')->where('year', $year)->sum('amount');
            });

            $plan = Projects::with('cashCostYearlies')->where('year_period', $startYear)->get()->sum(function ($item) use ($year) {
                return $item->cashCostYearlies->where('type', 'cost')->where('year', $year)->sum('amount');
            });

            // Round to 2 decimals instead of formatting
            $approved = $approved ? round($approved / 1000000, 2) : 0;
            $plan = $plan ? round($plan / 1000000, 2) : 0;

            $data->push([
                'year' => (string) $year,
                'approved' => $approved,
                'plan' => (float) number_format($lastYear[$index] / 1000000,2,'.',','),
            ]);
        }

        return $data;
    }
}
