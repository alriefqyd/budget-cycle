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
        Schema::create('budget_settings', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('project_id');
            $table->decimal('budget_cost', 18, 2)->nullable();
            $table->decimal('actual_to_date', 18, 2)->nullable();
            $table->decimal('budget_car', 18, 2)->nullable();
            $table->decimal('budget_5yp', 18, 2)->nullable();
            $table->integer('start_year')->nullable();
            $table->string('num_of_year_budget')->nullable(); // assuming string like "0-5"
            $table->decimal('total_cash', 18, 2)->nullable();
            $table->decimal('total_cost', 18, 2)->nullable();
            $table->decimal('cost_remaining', 18, 2)->nullable();

            $table->timestamps();
            $table->foreign('project_id')->references('id')->on('projects')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('budget_settings');
    }
};
