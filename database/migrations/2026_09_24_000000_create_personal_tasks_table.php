<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tareas personales de cada usuario (agenda personal).
     *
     * Son independientes de los proyectos. Pertenecen únicamente
     * al usuario que las creó y solo él puede verlas y gestionarlas.
     *
     * Las tareas no completadas se "arrastran" automáticamente:
     * la consulta trae todo lo que tenga scheduled_for <= hoy y
     * completed_at = null, sin necesidad de un job programado.
     */
    public function up(): void
    {
        Schema::create('personal_tasks', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->foreignId('priority_id')
                ->nullable()
                ->constrained('task_priorities')
                ->nullOnDelete();

            $table->string('description');

            // Fecha para la que está agendada la tarea.
            // Si hoy es mayor a scheduled_for y completed_at es null,
            // la tarea aparece igual (arrastre "lazy").
            $table->date('scheduled_for');

            // Null = pendiente. Timestamp = completada.
            $table->timestamp('completed_at')->nullable();

            // Orden manual dentro del día
            $table->unsignedInteger('order_column')->default(0);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('personal_tasks');
    }
};