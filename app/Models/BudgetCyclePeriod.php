<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use SebastianBergmann\CodeCoverage\Report\Xml\Project;

class BudgetCyclePeriod extends Model
{
    protected $guarded = ['id'];

    public function projects() {
        return $this->hasMany(Projects::class, 'budget_cycle_period_id', 'id');
    }

}
