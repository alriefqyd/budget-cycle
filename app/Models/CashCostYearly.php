<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Projects;

class CashCostYearly extends Model
{
    protected $table = 'cash_cost_yearlies';
    protected $fillable = ['project_id','type','year','amount'];

    public function projects(){
        return $this->belongsTo(Projects::class,'project_id','id');
    }
    public function cashCostMonthly(){
        return $this->hasMany(CashCostMonthly::class, 'yearly_id','id');
    }

}
