<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use SebastianBergmann\CodeCoverage\Report\Xml\Project;

class BudgetSetting extends Model
{
    protected $guarded = ['id'];
    public function projects(){
        return $this->belongsTo(Projects::class,'project_id','id');
    }
}
