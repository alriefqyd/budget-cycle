<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ActivityLogController extends Controller
{
    /**
     * System-wide activity feed (editor-only) — every create/update/delete/
     * import/finalize/lock action across projects, budgets, and users.
     * Filterable by actor and action so a specific change is easy to find.
     */
    public function index(Request $request): Response
    {
        $query = ActivityLog::with('user:id,name,email')
            ->orderByDesc('created_at');

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->input('user_id'));
        }

        if ($request->filled('action')) {
            $query->where('action', $request->input('action'));
        }

        $logs = $query->paginate(50)->withQueryString();

        return Inertia::render('ActivityLogs/Index', [
            'logs' => $logs,
            'users' => User::orderBy('name')->get(['id', 'name']),
            'actions' => ActivityLog::select('action')->distinct()->orderBy('action')->pluck('action'),
            'filters' => $request->only(['user_id', 'action']),
        ]);
    }
}
