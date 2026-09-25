<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Tarea personal de un usuario (agenda personal).
 *
 * Independiente de proyectos. Solo visible para el usuario dueño.
 *
 * Nomenclatura de campos:
 *   - description    → título de la tarea (nombre heredado, no se renombra)
 *   - notes          → descripción/detalle opcional
 *   - scheduled_for  → fecha programada (date)
 *   - scheduled_time → hora opcional (time|null). Si es null, la tarea es solo de fecha.
 *
 * Navegación de fechas:
 *   Los scopes reciben una $date Carbon para poder usarse con cualquier fecha,
 *   no solo con now(). Esto permite la navegación entre días en el frontend.
 *
 * Arrastre lazy (solo aplica al ver el día de HOY):
 *   Las tareas pendientes con scheduled_for < hoy siguen apareciendo como
 *   "Pendientes anteriores" hasta que se completen. No se reprograman.
 *   Al navegar a otro día se ven solo las tareas de ese día.
 */
class PersonalTask extends Model
{
    protected $fillable = [
        'user_id',
        'priority_id',
        'description',
        'notes',
        'scheduled_for',
        'scheduled_time',
        'completed_at',
        'order_column',
    ];

    protected $casts = [
        'scheduled_for' => 'date',
        'completed_at'  => 'datetime',
    ];

    // ─── Relaciones ────────────────────────────────────────────────

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function priority(): BelongsTo
    {
        return $this->belongsTo(TaskPriority::class, 'priority_id');
    }

    // ─── Scopes parametrizados por fecha ───────────────────────────

    /**
     * Tareas pendientes programadas exactamente para $date.
     */
    public function scopePendingForDate(Builder $query, Carbon $date): Builder
    {
        return $query
            ->whereNull('completed_at')
            ->whereDate('scheduled_for', $date);
    }

    /**
     * Tareas pendientes de días anteriores a $date (arrastre lazy).
     * Solo se usa al ver el día de hoy; al navegar a otro día no aplica.
     */
    public function scopeOverdueAsOf(Builder $query, Carbon $date): Builder
    {
        return $query
            ->whereNull('completed_at')
            ->whereDate('scheduled_for', '<', $date);
    }

    /**
     * Tareas completadas en $date (usa completed_at, no scheduled_for).
     */
    public function scopeCompletedOn(Builder $query, Carbon $date): Builder
    {
        return $query
            ->whereNotNull('completed_at')
            ->whereDate('completed_at', $date);
    }

    // ─── Scopes legacy (mantienen compatibilidad si se usan en otro lado) ──

    public function scopePending(Builder $query): Builder
    {
        return $this->scopePendingForDate($query, now());
    }

    public function scopePendingToday(Builder $query): Builder
    {
        return $this->scopePendingForDate($query, now());
    }

    public function scopeOverdue(Builder $query): Builder
    {
        return $this->scopeOverdueAsOf($query, now());
    }

    public function scopeCompletedToday(Builder $query): Builder
    {
        return $this->scopeCompletedOn($query, now());
    }
}
