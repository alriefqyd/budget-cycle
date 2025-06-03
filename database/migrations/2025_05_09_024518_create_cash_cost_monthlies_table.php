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
        Schema::create('cash_cost_monthlies', function (Blueprint $table) {
            $table->id(); // Primary key
            $table->foreignId('yearly_id')->constrained('cash_cost_yearlies')->onDelete('cascade');
            $table->unsignedTinyInteger('month'); // 1 (Jan) to 12 (Dec)
            $table->decimal('amount', 15, 2)->nullable(); // Amount for that month
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cash_cost_monthlies');
    }
};
