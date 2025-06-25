<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Auth/Login', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::get('/dashboard', [\App\Http\Controllers\HomeController::class, 'index'])->middleware(['auth', 'verified'])->name('dashboard');
Route::get('/budgets', [\App\Http\Controllers\ProjectsController::class, 'index'])->middleware(['auth'])->name('budget-list');
Route::get('/budgets/{year}', [\App\Http\Controllers\ProjectsController::class, 'show'])->middleware(['auth'])->name('budget-show');
Route::post('/budgets/upload', [\App\Http\Controllers\ProjectsController::class, 'upload'])->middleware(['auth'])->name('budget-upload');
Route::put('/budgets/{id}', [\App\Http\Controllers\ProjectsController::class, 'update'])->middleware(['auth'])->name('budget-update');
Route::post('/budgets/', [\App\Http\Controllers\ProjectsController::class, 'store'])->middleware(['auth'])->name('budget-create');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
