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
        Schema::create('cash_cost_yearlies', function (Blueprint $table) {
            $table->id(); // Primary key 'id'
            $table->foreignId('project_id')->constrained('projects'); // FK to Project Info
            $table->enum('type', ['cash', 'cost']); // Cash or Cost
            $table->year('year'); // Year (e.g. 2025, 2026...)
            $table->decimal('amount', 15, 2)->nullable(); // Optional field for actual cash/cost value
            $table->timestamps(); // created_at and updated_at
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cash_cost_yearlies');
    }
};
