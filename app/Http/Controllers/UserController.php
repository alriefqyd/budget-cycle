<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    private const ROLES = ['editor', 'viewer'];

    /**
     * List every user and their role, for the editor-only user-management page.
     */
    public function index(): Response
    {
        return Inertia::render('Users/Index', [
            'users' => User::orderBy('name')->get(['id', 'name', 'email', 'role']),
            'roles' => self::ROLES,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email',
            'password' => 'required|string|min:8',
            'role' => 'required|in:' . implode(',', self::ROLES),
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'email_verified_at' => now(),
        ]);
        ActivityLog::record('user.created', "Created user \"{$user->name}\" ({$user->email}) with role {$user->role}", $user);

        return Redirect::route('users.index');
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'role' => 'required|in:' . implode(',', self::ROLES),
        ]);

        // Demoting the last remaining editor to viewer would leave nobody able
        // to manage users, roles, or any mutating action ever again.
        if ($user->role === 'editor' && $validated['role'] !== 'editor' && $this->isLastEditor($user)) {
            return Redirect::route('users.index')->withErrors([
                'role' => 'Cannot demote the last editor — at least one editor must remain.',
            ]);
        }

        $roleChanged = $user->role !== $validated['role'];
        $previousRole = $user->role;
        $user->update($validated);

        $description = "Updated user \"{$user->name}\" ({$user->email})";
        if ($roleChanged) {
            $description .= " — role changed from {$previousRole} to {$user->role}";
        }
        ActivityLog::record('user.updated', $description, $user);

        return Redirect::route('users.index');
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        if ($user->id === $request->user()->id) {
            return Redirect::route('users.index')->withErrors([
                'delete' => 'You cannot delete your own account.',
            ]);
        }

        if ($user->role === 'editor' && $this->isLastEditor($user)) {
            return Redirect::route('users.index')->withErrors([
                'delete' => 'Cannot delete the last editor — at least one editor must remain.',
            ]);
        }

        ActivityLog::record('user.deleted', "Deleted user \"{$user->name}\" ({$user->email})", $user);
        $user->delete();

        return Redirect::route('users.index');
    }

    private function isLastEditor(User $user): bool
    {
        return User::where('role', 'editor')->where('id', '!=', $user->id)->doesntExist();
    }
}
