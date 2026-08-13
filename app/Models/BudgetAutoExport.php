<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BudgetAutoExport extends Model
{
    const UPDATED_AT = null;

    protected $guarded = ['id'];

    public function budgetCyclePeriod()
    {
        return $this->belongsTo(BudgetCyclePeriod::class);
    }
}
