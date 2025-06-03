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
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->string('sap_code');
            $table->string('project_title');
            $table->text('note')->nullable();
            $table->string('status_progress')->nullable();
            $table->string('project_manager')->nullable();
            $table->string('project_control')->nullable();
            $table->string('directorate')->nullable();
            $table->string('owner_area')->nullable();
            $table->string('type_of_investment')->nullable();
            $table->string('category')->nullable();
            $table->string('risk')->nullable();
            $table->string('fm_new')->nullable();
            $table->string('year_period')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('projects');
    }
};
