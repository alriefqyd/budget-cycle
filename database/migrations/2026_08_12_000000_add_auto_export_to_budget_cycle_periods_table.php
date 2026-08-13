<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('budget_cycle_periods', function (Blueprint $table) {
            $table->boolean('auto_export_enabled')->default(false)->after('approval_status');
            $table->unsignedInteger('auto_export_interval_minutes')->nullable()->after('auto_export_enabled');
            $table->timestamp('auto_export_last_run_at')->nullable()->after('auto_export_interval_minutes');
        });
    }

    public function down(): void
    {
        Schema::table('budget_cycle_periods', function (Blueprint $table) {
            $table->dropColumn(['auto_export_enabled', 'auto_export_interval_minutes', 'auto_export_last_run_at']);
        });
    }
};
