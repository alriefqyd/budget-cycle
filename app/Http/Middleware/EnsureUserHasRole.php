<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    /**
     * Blocks the request unless the authenticated user's role matches one of
     * the roles passed to the middleware (e.g. `role:editor`). Viewers pass
     * through read-only routes untouched — this only guards the routes it's
     * explicitly attached to.
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (!$user || !in_array($user->role, $roles, true)) {
            abort(403, 'Your account does not have permission to perform this action.');
        }

        return $next($request);
    }
}
