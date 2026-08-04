<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProjectChangeLog extends Model
{
    protected $fillable = ['project_id', 'user_id', 'field', 'old_value', 'new_value'];

    public function project()
    {
        return $this->belongsTo(Projects::class, 'project_id', 'id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }
}
