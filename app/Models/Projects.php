<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Projects extends Model
{
    protected $guarded = ['id'];
    public function budgets(){
        return $this->hasOne(BudgetSetting::class, 'project_id','id');
    }
    public function cashCostYearlies(){
        return $this->hasMany(CashCostYearly::class, 'project_id','id');
    }

    public function budgetCyclePeriods(){
        return $this->belongsTo(BudgetCyclePeriod::class, 'project_id','id');
    }

    public function getStatusBudgetCyclePeriods(){

    }
}
