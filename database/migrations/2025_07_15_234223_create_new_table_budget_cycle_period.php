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
        Schema::create('budget_cycle_periods', function (Blueprint $table) {
            $table->id();
            $table->string('approval_status')->nullable();
            $table->string('start_year')->nullable();
            $table->string('end_year')->nullable();
            $table->decimal('total_cost',18,2)->nullable();
            $table->decimal('total_cast',18,2)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('budget_cycle_periods');
    }
};
