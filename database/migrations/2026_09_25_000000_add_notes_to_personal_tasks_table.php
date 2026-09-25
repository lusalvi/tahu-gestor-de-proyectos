<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Agrega el campo `notes` (descripción opcional) a personal_tasks.
     *
     * El campo `description` existente representa el título de la tarea.
     * `notes` es el cuerpo/detalle opcional, alineando el modelo con el
     * resto del sistema donde "name" es título y "description" es cuerpo.
     *
     * No se renombra `description` para no romper datos existentes ni
     * requerir una migración destructiva antes de hablar con la supervisora.
     */
    public function up(): void
    {
        Schema::table('personal_tasks', function (Blueprint $table) {
            $table->text('notes')->nullable()->after('description');
        });
    }

    public function down(): void
    {
        Schema::table('personal_tasks', function (Blueprint $table) {
            $table->dropColumn('notes');
        });
    }
};