<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('budget_settings', function (Blueprint $table) {
            $table->decimal('bc_budget', 15, 2)->nullable()->after('budget_car');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('budget_settings', function (Blueprint $table) {
            $table->dropColumn('bc_budget');
        });
    }
};
