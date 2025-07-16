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
            $table->decimal('actual_to_date_cost',18,2)->nullable();
            $table->decimal('budget_5yp_cost',18,2)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('budget_settings', function (Blueprint $table) {
            $table->dropColumn('actual_to_date_cost');
            $table->dropColumn('budget_5yp_cost');
        });
    }
};
