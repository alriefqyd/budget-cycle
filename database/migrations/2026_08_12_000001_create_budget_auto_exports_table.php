<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('budget_auto_exports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('budget_cycle_period_id')->constrained()->cascadeOnDelete();
            $table->string('disk_path');
            $table->unsignedBigInteger('file_size')->nullable();
            $table->timestamp('created_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('budget_auto_exports');
    }
};
