<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use SebastianBergmann\CodeCoverage\Report\Xml\Project;

class BudgetCyclePeriod extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'auto_export_enabled' => 'boolean',
        'auto_export_last_run_at' => 'datetime',
    ];

    public function projects() {
        return $this->hasMany(Projects::class, 'budget_cycle_period_id', 'id');
    }

    public function autoExports() {
        return $this->hasMany(BudgetAutoExport::class);
    }

}
