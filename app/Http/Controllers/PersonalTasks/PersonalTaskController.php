<?php

namespace App\Http\Controllers\PersonalTasks;

use App\Http\Controllers\Controller;
use App\Models\PersonalTask;
use App\Models\TaskPriority;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Controlador de la agenda personal del usuario autenticado.
 *
 * Navegación de fechas:
 *   El query param `date` (Y-m-d) determina qué día se visualiza.
 *   Si no viene, se usa hoy. El frontend pasa la fecha al navegar ← →.
 *
 *   - Viendo HOY: se muestran las tareas de hoy + las pendientes de días
 *     anteriores (arrastre lazy) como sección "Pendientes anteriores".
 *   - Viendo otro día: se muestran solo las tareas de ese día (pendientes
 *     y completadas de esa fecha). No hay sección de arrastre.
 *
 * Ordenamiento:
 *   El param `sort_priority` (asc|desc) no modifica order_column.
 */
class PersonalTaskController extends Controller
{
    public function index(Request $request): Response
    {
        /** @var \App\Models\User $user */
        $user = auth()->user();

        // Fecha visualizada. Si no viene o es inválida, se usa hoy.
        $viewingDate = $request->input('date')
            ? Carbon::createFromFormat('Y-m-d', $request->input('date'))->startOfDay()
            : now()->startOfDay();

        $today        = now()->startOfDay();
        $isToday      = $viewingDate->isSameDay($today);
        $prioritySort = $request->input('sort_priority');

        // Closure de ordenamiento reutilizable (no modifica order_column)
        $withOrder = function ($query) use ($prioritySort) {
            $query->with('priority');

            if ($prioritySort) {
                $direction = $prioritySort === 'asc' ? 'asc' : 'desc';
                $query
                    ->leftJoin('task_priorities', 'personal_tasks.priority_id', '=', 'task_priorities.id')
                    ->orderByRaw('personal_tasks.priority_id IS NULL')
                    ->orderBy('task_priorities.order', $direction)
                    ->orderBy('personal_tasks.order_column', 'asc')
                    ->select('personal_tasks.*');
            } else {
                // Sin sort por prioridad: si hay hora la ponemos primero dentro del día
                $query->orderByRaw('personal_tasks.scheduled_time IS NULL')
                      ->orderBy('personal_tasks.scheduled_time', 'asc')
                      ->orderBy('personal_tasks.order_column', 'asc');
            }
        };

        // Tareas programadas para el día visualizado (pendientes)
        $dateTasks = PersonalTask::where('user_id', $user->id)
            ->pendingForDate($viewingDate)
            ->tap($withOrder)
            ->get();

        // Arrastre lazy: solo al ver HOY
        $overdueTasks = $isToday
            ? PersonalTask::where('user_id', $user->id)
                ->overdueAsOf($today)
                ->tap($withOrder)
                ->get()
            : collect();

        // Completadas: las del día visualizado (por completed_at)
        $completedTasks = PersonalTask::where('user_id', $user->id)
            ->completedOn($viewingDate)
            ->with('priority')
            ->orderBy('completed_at', 'desc')
            ->get();

        return Inertia::render('PersonalTasks/Index', [
            'dateTasks'      => $dateTasks,
            'overdueTasks'   => $overdueTasks,
            'completedTasks' => $completedTasks,
            'priorities'     => TaskPriority::orderBy('order')->get(),
            'viewingDate'    => $viewingDate->toDateString(),
            'today'          => $today->toDateString(),
            'isToday'        => $isToday,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'description'    => ['required', 'string', 'max:500'],
            'notes'          => ['nullable', 'string', 'max:5000'],
            'priority_id'    => ['nullable', 'exists:task_priorities,id'],
            'scheduled_for'  => ['required', 'date'],
            'scheduled_time' => ['nullable', 'date_format:H:i'],
        ]);

        PersonalTask::create([
            ...$validated,
            'user_id'      => auth()->id(),
            'order_column' => PersonalTask::where('user_id', auth()->id())
                ->whereDate('scheduled_for', $validated['scheduled_for'])
                ->max('order_column') + 1,
        ]);

        return back();
    }

    public function update(Request $request, PersonalTask $personalTask): RedirectResponse
    {
        Gate::allowIf(fn () => $personalTask->user_id === auth()->id());

        $validated = $request->validate([
            'description'    => ['sometimes', 'required', 'string', 'max:500'],
            'notes'          => ['sometimes', 'nullable', 'string', 'max:5000'],
            'priority_id'    => ['sometimes', 'nullable', 'exists:task_priorities,id'],
            'scheduled_for'  => ['sometimes', 'required', 'date'],
            'scheduled_time' => ['sometimes', 'nullable', 'date_format:H:i'],
        ]);

        $personalTask->update($validated);

        return back();
    }

    public function toggle(PersonalTask $personalTask): RedirectResponse
    {
        Gate::allowIf(fn () => $personalTask->user_id === auth()->id());

        $personalTask->update([
            'completed_at' => $personalTask->completed_at ? null : now(),
        ]);

        return back();
    }

    public function destroy(PersonalTask $personalTask): RedirectResponse
    {
        Gate::allowIf(fn () => $personalTask->user_id === auth()->id());

        $personalTask->delete();

        return back();
    }

    /**
     * Limpia las completadas del día visualizado (por completed_at).
     * Recibe el query param `date` para saber qué día limpiar.
     */
    public function clearCompleted(Request $request): RedirectResponse
    {
        $viewingDate = $request->input('date')
            ? Carbon::createFromFormat('Y-m-d', $request->input('date'))->startOfDay()
            : now()->startOfDay();

        PersonalTask::where('user_id', auth()->id())
            ->completedOn($viewingDate)
            ->delete();

        return back();
    }
}