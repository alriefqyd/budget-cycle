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
     * Filterable by actor, action, and date range so a specific change is
     * easy to find; the frontend groups the (still per-row) results by day.
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

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->input('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->input('date_to'));
        }

        $logs = $query->paginate(50)->withQueryString();

        return Inertia::render('ActivityLogs/Index', [
            'logs' => $logs,
            'users' => User::orderBy('name')->get(['id', 'name']),
            'actions' => ActivityLog::select('action')->distinct()->orderBy('action')->pluck('action'),
            'filters' => $request->only(['user_id', 'action', 'date_from', 'date_to']),
        ]);
    }
}
