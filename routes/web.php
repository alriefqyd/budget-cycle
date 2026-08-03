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
Route::get('/budgets-compare/{year}', [\App\Http\Controllers\ProjectsController::class, 'compareData'])->middleware(['auth'])->name('budget-compare-data');
Route::post('/budgets/upload', [\App\Http\Controllers\ProjectsController::class, 'upload'])->middleware(['auth'])->name('budget-upload');
Route::post('/export/budgets', [\App\Http\Controllers\ProjectsController::class, 'export'])->middleware(['auth'])->name('budget-detail-upload');
Route::post('/budgets/import-project', [\App\Http\Controllers\ProjectsController::class, 'uploadProject'])->middleware(['auth'])->name('budget-upload-detail');
Route::post('/budgets/create', [\App\Http\Controllers\ProjectsController::class, 'create'])->middleware(['auth'])->name('budget-create-period');
Route::put('/budgets/{id}', [\App\Http\Controllers\ProjectsController::class, 'update'])->middleware(['auth'])->name('budget-update');
Route::put('/budgets-finalize/{year}/{version}', [\App\Http\Controllers\ProjectsController::class, 'finalize'])->middleware(['auth'])->name('budget-finalize');
Route::put('/budgets-lock/{year}/{version}', [\App\Http\Controllers\ProjectsController::class, 'lock'])->middleware(['auth'])->name('budget-lock');
Route::get('/budgets-version/{year}/{version}', [\App\Http\Controllers\ProjectsController::class, 'getBudgetByYearAndVersion'])->middleware(['auth'])->name('budget-version-show');
Route::get('/budgets-versions/{year}/', [\App\Http\Controllers\ProjectsController::class, 'getVersionList'])->middleware(['auth'])->name('budget-version-list');
Route::delete('/budgets-version/{year}/{version}', [\App\Http\Controllers\ProjectsController::class, 'deleteVersion'])->middleware(['auth'])->name('budget-version-delete');
Route::post('/budgets/', [\App\Http\Controllers\ProjectsController::class, 'store'])->middleware(['auth'])->name('budget-create');
Route::delete('/budgets', [\App\Http\Controllers\ProjectsController::class, 'destroy'])->middleware(['auth'])->name('budget-delete');
Route::post('/budgets/duplicate', [\App\Http\Controllers\ProjectsController::class, 'duplicate'])->middleware(['auth'])->name('budget-duplicate');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
