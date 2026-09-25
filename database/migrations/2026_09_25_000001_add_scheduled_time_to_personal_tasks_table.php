<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Agrega hora opcional a la tarea personal.
     *
     * scheduled_time es nullable: una tarea puede ser solo de fecha
     * ("Comprar pasajes — 26/09") o tener hora ("Llamar a Juan — 26/09 a las 15:30").
     */
    public function up(): void
    {
        Schema::table('personal_tasks', function (Blueprint $table) {
            $table->time('scheduled_time')->nullable()->after('scheduled_for');
        });
    }

    public function down(): void
    {
        Schema::table('personal_tasks', function (Blueprint $table) {
            $table->dropColumn('scheduled_time');
        });
    }
};