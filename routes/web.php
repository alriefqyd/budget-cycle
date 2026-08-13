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
Route::get('/getDashboardByVersion', [\App\Http\Controllers\HomeController::class, 'getDashboardByVersion'])->middleware(['auth', 'verified']);
Route::get('/budgets', [\App\Http\Controllers\ProjectsController::class, 'index'])->middleware(['auth'])->name('budget-list');
Route::get('/budgets/{year}', [\App\Http\Controllers\ProjectsController::class, 'show'])->middleware(['auth'])->name('budget-show');
Route::get('/budgets/{year}/compare', [\App\Http\Controllers\ProjectsController::class, 'compare'])->middleware(['auth'])->name('budget-compare');
Route::get('/budgets/{year}/my-forecast', [\App\Http\Controllers\ProjectsController::class, 'myForecast'])->middleware(['auth'])->name('budget-my-forecast');
Route::get('/budgets/{id}/history', [\App\Http\Controllers\ProjectsController::class, 'history'])->middleware(['auth'])->name('budget-history');
Route::get('/budgets-compare/{year}', [\App\Http\Controllers\ProjectsController::class, 'compareData'])->middleware(['auth'])->name('budget-compare-data');
Route::post('/budgets/upload', [\App\Http\Controllers\ProjectsController::class, 'upload'])->middleware(['auth', 'role:editor'])->name('budget-upload');
Route::post('/export/budgets', [\App\Http\Controllers\ProjectsController::class, 'export'])->middleware(['auth'])->name('budget-detail-upload');
Route::post('/budgets/import-project', [\App\Http\Controllers\ProjectsController::class, 'uploadProject'])->middleware(['auth', 'role:editor'])->name('budget-upload-detail');
Route::post('/budgets/create', [\App\Http\Controllers\ProjectsController::class, 'create'])->middleware(['auth', 'role:editor'])->name('budget-create-period');
Route::put('/budgets/{id}', [\App\Http\Controllers\ProjectsController::class, 'update'])->middleware(['auth', 'role:editor'])->name('budget-update');
Route::put('/budgets-finalize/{year}/{version}', [\App\Http\Controllers\ProjectsController::class, 'finalize'])->middleware(['auth', 'role:editor'])->name('budget-finalize');
Route::put('/budgets-lock/{year}/{version}', [\App\Http\Controllers\ProjectsController::class, 'lock'])->middleware(['auth', 'role:editor'])->name('budget-lock');
Route::get('/budgets-version/{year}/{version}', [\App\Http\Controllers\ProjectsController::class, 'getBudgetByYearAndVersion'])->middleware(['auth'])->name('budget-version-show');
Route::get('/budgets-versions/{year}/', [\App\Http\Controllers\ProjectsController::class, 'getVersionList'])->middleware(['auth'])->name('budget-version-list');
Route::get('/budgets-trend/{year}', [\App\Http\Controllers\ProjectsController::class, 'versionTrend'])->middleware(['auth'])->name('budget-version-trend');
Route::put('/budgets-auto-export/{year}/{version}', [\App\Http\Controllers\ProjectsController::class, 'updateAutoExportSettings'])->middleware(['auth', 'role:editor'])->name('budget-auto-export-update');
Route::get('/budgets-auto-export/{year}/{version}', [\App\Http\Controllers\ProjectsController::class, 'listAutoExports'])->middleware(['auth'])->name('budget-auto-export-list');
Route::get('/budgets-auto-export/{year}/{version}/{exportId}/download', [\App\Http\Controllers\ProjectsController::class, 'downloadAutoExport'])->middleware(['auth'])->name('budget-auto-export-download');
Route::delete('/budgets-version/{year}/{version}', [\App\Http\Controllers\ProjectsController::class, 'deleteVersion'])->middleware(['auth', 'role:editor'])->name('budget-version-delete');
Route::post('/budgets/', [\App\Http\Controllers\ProjectsController::class, 'store'])->middleware(['auth', 'role:editor'])->name('budget-create');
Route::delete('/budgets', [\App\Http\Controllers\ProjectsController::class, 'destroy'])->middleware(['auth', 'role:editor'])->name('budget-delete');
Route::post('/budgets/duplicate', [\App\Http\Controllers\ProjectsController::class, 'duplicate'])->middleware(['auth', 'role:editor'])->name('budget-duplicate');
Route::post('/budgets/find-replace', [\App\Http\Controllers\ProjectsController::class, 'findReplace'])->middleware(['auth', 'role:editor'])->name('budget-find-replace');

Route::middleware(['auth', 'role:editor'])->group(function () {
    Route::get('/users', [\App\Http\Controllers\UserController::class, 'index'])->name('users.index');
    Route::post('/users', [\App\Http\Controllers\UserController::class, 'store'])->name('users.store');
    Route::patch('/users/{user}', [\App\Http\Controllers\UserController::class, 'update'])->name('users.update');
    Route::delete('/users/{user}', [\App\Http\Controllers\UserController::class, 'destroy'])->name('users.destroy');
    Route::get('/activity-logs', [\App\Http\Controllers\ActivityLogController::class, 'index'])->name('activity-logs.index');
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
