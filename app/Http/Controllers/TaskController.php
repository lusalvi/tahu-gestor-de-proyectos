<?php

namespace App\Http\Controllers;

use App\Actions\Task\CreateTask;
use App\Actions\Task\UpdateTask;
use App\Events\Task\TaskDeleted;
use App\Events\Task\TaskGroupChanged;
use App\Events\Task\TaskOrderChanged;
use App\Events\Task\TaskRestored;
use App\Events\Task\TaskUpdated;
use App\Http\Requests\Task\StoreTaskRequest;
use App\Http\Requests\Task\UpdateTaskRequest;
use App\Http\Resources\TaskPriorityResource;
use App\Models\Label;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskGroup;
use App\Models\TaskPriority;
use App\Services\ForceDeleteService;
use App\Services\PermissionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Controlador de tareas (actividades) dentro de un proyecto.
 *
 * Gestiona el ciclo de vida completo de las tareas: listado agrupado por estado,
 * creación, edición, reordenamiento, cambio de grupo, jerarquía padre-hijo,
 * archivado, restauración y eliminación permanente.
 */
class TaskController extends Controller
{
    /**
     * Muestra el tablero Kanban del proyecto con las tareas agrupadas por estado.
     *
     * Soporta búsqueda por texto, filtros por query string, ordenamiento por prioridad
     * y visualización de tareas archivadas. Cuando hay una búsqueda activa, también
     * incluye los ancestros de las tareas encontradas para poder renderizar
     * correctamente la jerarquía en el frontend.
     *
     * @param  Request  $request  Puede contener: search, sort_priority, archived, y otros filtros.
     * @param  Project  $project  Proyecto al que pertenecen las tareas.
     * @param  Task|null  $task  Tarea específica a abrir en el panel lateral (opcional).
     */
    public function index(Request $request, Project $project, ?int $taskId = null): Response
    {
        $this->authorize('viewAny', [Task::class, $project]);

        $task = null;
        $taskStatusNotice = null;

        if ($taskId !== null) {
            $task = Task::withArchived()->where('project_id', $project->id)->find($taskId);

            if (! $task) {
                $taskStatusNotice = 'missing';

                session()->flash('flash', [
                    'type' => 'warning',
                    'title' => 'Actividad no encontrada',
                    'message' => 'La actividad a la que intentas acceder ya no existe. Es posible que haya sido eliminada',
                ]);
            } elseif ($task->isArchived()) {
                $taskStatusNotice = 'archived';

                session()->flash('flash', [
                    'type' => 'info',
                    'title' => 'Actividad archivada',
                    'message' => 'Esta actividad fue archivada',
                ]);
            }
        }

        // Si la tarea fue eliminada o archivada, no tiene sentido armar el tablero
        // completo del proyecto de atrás: se corta acá y el frontend, al recibir
        // taskStatusNotice, muestra el cartel correspondiente sin montar el board.
        if ($taskStatusNotice !== null) {
            return Inertia::render('Projects/Tasks/Index', [
                'project' => $project,
                'usersWithAccessToProject' => PermissionService::usersWithAccessToProject($project),
                'labels' => Label::get(['id', 'name', 'color']),
                'priorities' => TaskPriorityResource::collection(TaskPriority::orderBy('order')->get()),
                'taskGroups' => $project->taskGroups()->get(),
                'groupedTasks' => [],
                'openedTask' => null,
                'taskStatusNotice' => $taskStatusNotice,
            ]);
        }

        $groups = $project
            ->taskGroups()
            ->when($request->has('archived'), fn ($query) => $query->onlyArchived())
            ->get();

        $searchQuery = $request->input('search');

        $groupedTasks = $project
            ->taskGroups()
            ->with(['project' => fn ($query) => $query->withArchived()])
            ->get()
            ->mapWithKeys(function (TaskGroup $group) use ($request, $project, $searchQuery) {
                $prioritySort = $request->input('sort_priority');

                $matchedTasks = Task::where('project_id', $project->id)
                    ->where('group_id', $group->id)
                    ->searchByQueryString()
                    ->filterByQueryString()
                    ->when($request->has('archived'), fn ($query) => $query->onlyArchived())
                    ->withDefault()
                    ->when($project->isArchived(), fn ($query) => $query->with(['project' => fn ($query) => $query->withArchived()]))
                    ->when($prioritySort, function ($query, $direction) {
                        // Ordenamiento por prioridad: las tareas sin prioridad van al final,
                        // luego se ordena por el campo `order` de task_priorities.
                        $direction = $direction === 'asc' ? 'asc' : 'desc';

                        $query
                            ->leftJoin('task_priorities', 'tasks.priority_id', '=', 'task_priorities.id')
                            ->orderByRaw('tasks.priority_id IS NULL')
                            ->orderBy('task_priorities.order', $direction)
                            ->orderByDesc('tasks.created_at')
                            ->select('tasks.*');
                    }, function ($query) {
                        $query->orderByDesc('created_at');
                    })
                    ->get();

                // Cuando hay búsqueda activa, se necesitan los ancestros de las tareas
                // encontradas para que el frontend pueda reconstruir el árbol de jerarquía.
                if ($searchQuery) {
                    $matchedIds = $matchedTasks->pluck('id')->all();
                    $ancestorIds = [];

                    // Punto de partida: padres directos de las tareas que tienen parent
                    $toCheck = $matchedTasks->filter(fn ($t) => $t->parent_task_id)->pluck('parent_task_id')->unique()->all();

                    // Se sube por la cadena de padres hasta llegar a la raíz
                    while (! empty($toCheck)) {
                        // Solo se buscan los padres que todavía no están en el resultado
                        $missing = array_diff($toCheck, $matchedIds, $ancestorIds);

                        if (empty($missing)) {
                            break;
                        }

                        $ancestors = Task::whereIn('id', $missing)
                            ->where('project_id', $project->id)
                            ->where('group_id', $group->id)
                            ->withDefault()
                            ->when($project->isArchived(), fn ($query) => $query->with(['project' => fn ($query) => $query->withArchived()]))
                            ->get();

                        $ancestorIds = array_merge($ancestorIds, $ancestors->pluck('id')->all());
                        $toCheck = $ancestors->filter(fn ($t) => $t->parent_task_id)->pluck('parent_task_id')->unique()->all();

                        $matchedTasks = $matchedTasks->merge($ancestors);
                    }
                }

                return [$group->id => $matchedTasks];
            });

        return Inertia::render('Projects/Tasks/Index', [
            'project' => $project,
            'usersWithAccessToProject' => PermissionService::usersWithAccessToProject($project),
            'labels' => Label::get(['id', 'name', 'color']),
            'priorities' => TaskPriorityResource::collection(TaskPriority::orderBy('order')->get()),
            'taskGroups' => $groups,
            'groupedTasks' => $groupedTasks,
            'openedTask' => $task ? $task->loadDefault() : null,
            'taskStatusNotice' => null,
        ]);
    }

    /**
     * Devuelve el estado actual de una tarea (activa, archivada o inexistente).
     *
     * Pensado para ser consultado por el frontend ANTES de navegar hacia una
     * notificación, así se puede mostrar un aviso sin abandonar la página actual
     * cuando la tarea ya no está disponible.
     */
    public function status(Project $project, int $taskId): JsonResponse
    {
        $this->authorize('viewAny', [Task::class, $project]);

        $task = Task::withArchived()->where('project_id', $project->id)->find($taskId);

        if (! $task) {
            return response()->json(['status' => 'missing']);
        }

        if ($task->isArchived()) {
            return response()->json(['status' => 'archived']);
        }

        return response()->json(['status' => 'active']);
    }

    /**
     * Crea una nueva tarea dentro del proyecto.
     *
     * Delega la lógica de creación (notificaciones, adjuntos, etc.) al Action CreateTask.
     *
     * @param  StoreTaskRequest  $request  Datos validados de la tarea.
     * @param  Project  $project  Proyecto al que pertenece la tarea.
     */
    public function store(StoreTaskRequest $request, Project $project): RedirectResponse
    {
        $this->authorize('create', [Task::class, $project]);

        (new CreateTask)->create($project, $request->validated());

        return redirect()->route('projects.tasks', $project)->success('Actividad añadida', 'Una nueva actividad se añadió con éxito.');
    }

    /**
     * Actualiza los datos de una tarea existente.
     *
     * Delega la lógica de actualización (eventos, notificaciones) al Action UpdateTask.
     *
     * @param  UpdateTaskRequest  $request  Datos validados con los campos a modificar.
     * @param  Project  $project  Proyecto al que pertenece la tarea.
     * @param  Task  $task  Tarea a actualizar.
     */
    public function update(UpdateTaskRequest $request, Project $project, Task $task): JsonResponse
    {
        $this->authorize('update', [$task, $project]);

        (new UpdateTask)->update($task, $request->validated());

        return response()->json();
    }

    /**
     * Reordena las tareas dentro de un mismo grupo (drag & drop en el Kanban).
     *
     * Recibe el nuevo orden de IDs y dispara el evento para sincronizar en tiempo real.
     *
     * @param  Request  $request  Contiene: ids (array de IDs en el nuevo orden),
     *                            group_id, from_index, to_index.
     */
    public function reorder(Request $request, Project $project): JsonResponse
    {
        $this->authorize('reorder', [Task::class, $project]);

        Task::setNewOrder($request->ids);

        TaskOrderChanged::dispatch(
            $project->id,
            $request->group_id,
            $request->from_index,
            $request->to_index,
        );

        return response()->json();
    }

    /**
     * Mueve tareas de un grupo a otro (cambio de columna en el Kanban).
     *
     * Si el grupo destino se llama "Finalizado", marca las tareas como completadas
     * automáticamente. En caso contrario, elimina la fecha de completado.
     *
     * @param  Request  $request  Contiene: ids, to_group_id, from_group_id, from_index, to_index.
     */
    public function move(Request $request, Project $project): JsonResponse
    {
        $this->authorize('reorder', [Task::class, $project]);

        Task::setNewOrder($request->ids);

        $toGroup = TaskGroup::find($request->to_group_id);
        // Las tareas que llegan al grupo "Finalizado" se marcan como completadas automáticamente.
        $isCompletedGroup = $toGroup && $toGroup->name === 'Finalizado';

        Task::whereIn('id', $request->ids)->update([
            'group_id' => $request->to_group_id,
            'completed_at' => $isCompletedGroup ? now() : null,
        ]);

        TaskGroupChanged::dispatch(
            $project->id,
            $request->from_group_id,
            $request->to_group_id,
            $request->from_index,
            $request->to_index,
        );

        return response()->json();
    }

    /**
     * Cambia el padre de una tarea (reparentación en la jerarquía).
     *
     * Valida que no se generen ciclos en el árbol de jerarquía y que el tipo de issue
     * del padre sea compatible con el del hijo. Si `parent_task_id` es null,
     * la tarea pasa a ser raíz.
     *
     * @param  Request  $request  Contiene: task_id, parent_task_id (nullable), ids (nuevo orden).
     */
    public function reparent(Request $request, Project $project): JsonResponse
    {
        $this->authorize('reorder', [Task::class, $project]);

        $request->validate([
            'task_id' => ['required', 'exists:tasks,id'],
            'parent_task_id' => ['nullable', 'exists:tasks,id'],
            'ids' => ['required', 'array'],
            'ids.*' => ['integer', 'exists:tasks,id'],
        ]);

        $task = Task::findOrFail($request->task_id);

        if ($request->parent_task_id) {
            // Una tarea no puede ser padre de sí misma.
            if ((int) $request->parent_task_id === $task->id) {
                return response()->json(['message' => 'Una actividad no puede ser su propio padre.'], 422);
            }

            $newParent = Task::findOrFail($request->parent_task_id);

            // Validación de compatibilidad de tipo (ej: un sub-task no puede tener una epic como hijo)
            if (! $newParent->canHaveChildOfType($task->issue_type)) {
                return response()->json([
                    'message' => "Una {$newParent->issue_type} no puede tener como hija una {$task->issue_type}.",
                ], 422);
            }

            // Detección de ciclos: se sube por la cadena de ancestros del nuevo padre
            // para asegurarse de que la tarea que se mueve no aparezca en ella.
            $ancestor = $newParent;
            while ($ancestor) {
                if ($ancestor->id === $task->id) {
                    return response()->json(['message' => 'No se puede mover una actividad dentro de su propia descendiente.'], 422);
                }
                $ancestor = $ancestor->parent;
            }
        }

        $task->update(['parent_task_id' => $request->parent_task_id]);

        Task::setNewOrder($request->ids);

        return response()->json();
    }

    /**
     * Marca o desmarca una tarea como completada.
     *
     * @param  Request  $request  Contiene: completed (bool).
     */
    public function complete(Request $request, Project $project, Task $task): JsonResponse
    {
        $this->authorize('complete', [Task::class, $project]);

        $task->update([
            'completed_at' => ($request->completed === true) ? now() : null,
        ]);
        TaskUpdated::dispatch($task, 'completed_at');

        return response()->json();
    }

    /**
     * Archiva una tarea y todas sus subtareas en cascada.
     */
    public function destroy(Project $project, Task $task): RedirectResponse
    {
        $this->authorize('delete', [$task, $project]);

        $task->archiveWithChildren(auth()->id());
        TaskDeleted::dispatch($task->id, $task->project_id);

        return redirect()->back()->success('Actividad Archivada', 'La actividad se archivó con éxito.');
    }

    /**
     * Restaura una tarea archivada y todas sus subtareas.
     */
    public function restore(Project $project, Task $task): RedirectResponse
    {

        $this->authorize('restore', [$task, $project]);

        $task->restoreWithChildren();
        TaskRestored::dispatch($task);

        return redirect()->back()->success('Actividad Restaurada', 'La restauración de la actividad se realizó con éxito.');
    }

    /**
     * Archiva múltiples tareas a la vez.
     *
     * Verifica autorización usando la primera tarea de la lista.
     * Cada tarea se archiva con sus subtareas en cascada.
     *
     * @param  Request  $request  Contiene: ids (array de IDs de tareas a archivar).
     */
    public function bulkArchive(Request $request, Project $project): JsonResponse
    {
        $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['integer', 'exists:tasks,id'],
        ]);

        $tasksToArchive = Task::whereIn('id', $request->ids)
            ->where('project_id', $project->id)
            ->get();

        // La política espera (Task, Project); se usa la primera tarea como representante del lote.
        if ($tasksToArchive->isNotEmpty()) {
            $this->authorize('delete', [$tasksToArchive->first(), $project]);
        }

        $tasksToArchive->each(function ($task) {
            $task->archiveWithChildren(auth()->id());
            TaskDeleted::dispatch($task->id, $task->project_id);
        });

        return response()->json(['message' => 'Actividades archivadas con éxito.']);
    }

    /**
     * Elimina permanentemente un lote de tareas archivadas.
     *
     * Solo procesa tareas raíz (sin padre): el servicio de borrado desciende
     * recursivamente por las subtareas, por lo que no hace falta incluirlas
     * explícitamente en la solicitud.
     *
     * @param  Request  $request  Contiene: ids (IDs de tareas raíz a eliminar).
     * @param  ForceDeleteService  $forceDeleteService  Servicio encargado del borrado en cascada.
     */
    public function bulkForceDelete(Request $request, Project $project, ForceDeleteService $forceDeleteService): RedirectResponse
    {
        $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'exists:tasks,id'],
        ]);

        // Solo tareas raíz: forceDeleteTask baja recursivamente por sus subtareas.
        $tasksToDelete = Task::onlyArchived()
            ->whereIn('id', $request->ids)
            ->where('project_id', $project->id)
            ->whereNull('parent_task_id')
            ->get();

        foreach ($tasksToDelete as $task) {
            $this->authorize('forceDelete', [$task, $project]);
        }

        $deletedCount = 0;
        DB::transaction(function () use ($tasksToDelete, $forceDeleteService, &$deletedCount) {
            foreach ($tasksToDelete as $task) {
                $forceDeleteService->forceDeleteTask($task);
                $deletedCount++;
            }
        });

        return redirect()->back()->success(
            'Actividades Eliminadas',
            "{$deletedCount} actividad(es) eliminada(s) permanentemente."
        );
    }
}