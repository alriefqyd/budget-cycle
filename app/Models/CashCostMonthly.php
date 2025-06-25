<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CashCostMonthly extends Model
{
    protected $table = 'cash_cost_monthlies';
    protected $fillable = ['yearly_id','month','amount','type'];
    public function cashCostYearly(){
        return $this->belongsTo(CashCostYearly::class,'yearly_id','id');
    }
}
