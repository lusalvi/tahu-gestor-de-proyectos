<?php

use App\Http\Controllers\Account\NotificationController;
use App\Http\Controllers\Account\ProfileController;
use App\Http\Controllers\Area\AreaController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DropdownValuesController;
use App\Http\Controllers\MyWork\ActivityController;
use App\Http\Controllers\MyWork\MyWorkTaskController;
use App\Http\Controllers\Note\NoteController;
use App\Http\Controllers\ProjectCalendarController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ProjectTimelineController;
use App\Http\Controllers\Settings\LabelController;
use App\Http\Controllers\Settings\RoleController;
use App\Http\Controllers\Settings\TaskPriorityController;
use App\Http\Controllers\Task\AttachmentController;
use App\Http\Controllers\Task\CommentController;
use App\Http\Controllers\Task\GroupController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', 'dashboard');

Route::get('/storage/avatars/{filename}', function ($filename) {
    $path = storage_path("app/public/avatars/{$filename}");
    
    if (!file_exists($path)) {
        abort(404);
    }
    
    return response()->file($path, [
        'Content-Type' => mime_content_type($path) ?: 'image/jpeg',
    ]);
})->name('avatar.serve');

Route::group(['middleware' => ['auth:sanctum']], function () {
    // Dashboard
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Projects
    Route::resource('projects', ProjectController::class)->except(['show']);

    Route::group(['prefix' => 'projects', 'as' => 'projects.'], function () {
        // PROJECT
        Route::post('{projectId}/restore', [ProjectController::class, 'restore'])->name('restore');
        Route::post('bulk-force-delete', [ProjectController::class, 'bulkForceDelete'])->name('bulk-force-delete');
        Route::put('{project}/favorite/toggle', [ProjectController::class, 'favoriteToggle'])->name('favorite.toggle');
        Route::post('{project}/user-access', [ProjectController::class, 'userAccess'])->name('user_access');
        // CALENDAR
        Route::get('{project}/calendar', [ProjectCalendarController::class, 'index'])->name('calendar');
        // TIMELINE
        Route::get('{project}/timeline', [ProjectTimelineController::class, 'index'])->name('timeline');
        // TASK GROUPS
        Route::post('{project}/task-groups', [GroupController::class, 'store'])->name('task-groups.store');
        Route::put('{project}/task-groups/{taskGroup}', [GroupController::class, 'update'])->name('task-groups.update')->scopeBindings();
        Route::delete('{project}/task-groups/{taskGroup}', [GroupController::class, 'destroy'])->name('task-groups.destroy')->scopeBindings();
        Route::post('{project}/task-groups/{taskGroupId}/restore', [GroupController::class, 'restore'])->name('task-groups.restore')->scopeBindings();
        Route::post('{project}/task-groups/reorder', [GroupController::class, 'reorder'])->name('task-groups.reorder');
        Route::post('{project}/task-groups/bulk-force-delete', [GroupController::class, 'bulkForceDelete'])->name('task-groups.bulk-force-delete');

        // TASKS
        Route::get('{project}/tasks', [TaskController::class, 'index'])->name('tasks');
        Route::post('{project}/tasks', [TaskController::class, 'store'])->name('tasks.store');
        Route::put('{project}/tasks/{task}', [TaskController::class, 'update'])->name('tasks.update')->scopeBindings();
        Route::get('{project}/tasks/{task}/open', [TaskController::class, 'index'])->name('tasks.open')->scopeBindings();
        Route::delete('{project}/tasks/{task}', [TaskController::class, 'destroy'])->name('tasks.destroy')->scopeBindings();
        Route::post('{project}/tasks/{task}/restore', [TaskController::class, 'restore'])->name('tasks.restore');

        Route::post('{project}/tasks/{task}/complete', [TaskController::class, 'complete'])->name('tasks.complete')->scopeBindings();
        Route::post('{project}/tasks/reorder', [TaskController::class, 'reorder'])->name('tasks.reorder');
        Route::post('{project}/tasks/move', [TaskController::class, 'move'])->name('tasks.move');
        Route::post('{project}/tasks/reparent', [TaskController::class, 'reparent'])->name('tasks.reparent');
        Route::post('{project}/tasks/bulk-archive', [TaskController::class, 'bulkArchive'])->name('tasks.bulk-archive');
        Route::post('{project}/tasks/bulk-force-delete', [TaskController::class, 'bulkForceDelete'])->name('tasks.bulk-force-delete');

        // NOTES
        Route::get('{project}/notes', [NoteController::class, 'index'])->name('notes');
        Route::post('{project}/notes', [NoteController::class, 'store'])->name('notes.store');
        Route::put('{project}/notes/{note}', [NoteController::class, 'update'])->name('notes.update')->scopeBindings();
        Route::delete('{project}/notes/{note}', [NoteController::class, 'destroy'])->name('notes.destroy')->scopeBindings();
        Route::post('{project}/notes/{note}/lock', [NoteController::class, 'lock'])->name('notes.lock')->scopeBindings();
        Route::post('{project}/notes/{note}/unlock', [NoteController::class, 'unlock'])->middleware(['throttle:10,1'])->scopeBindings();
        Route::post('{project}/notes/{note}/remove-lock', [NoteController::class, 'removeLock'])->name('notes.remove-lock')->scopeBindings();

        // ATTACHMENTS
        Route::group(['prefix' => '{project}/tasks/{task}', 'as' => 'tasks.'], function () {
            Route::post('attachments/upload', [AttachmentController::class, 'store'])->name('attachments.upload');
            Route::delete('attachments/{attachment}', [AttachmentController::class, 'destroy'])->name('attachments.destroy');
        })->scopeBindings();

        // COMMENTS
        Route::group(['prefix' => '{project}/tasks/{task}', 'as' => 'tasks.'], function () {
            Route::get('comment', [CommentController::class, 'index'])->name('comments');
            Route::post('comment', [CommentController::class, 'store'])->name('comments.store');
        })->scopeBindings();
    });

    // My Work
    Route::group(['prefix' => 'my-work', 'as' => 'my-work.'], function () {
        Route::get('tasks', [MyWorkTaskController::class, 'index'])->name('tasks.index');
        Route::get('activity', [ActivityController::class, 'index'])->name('activity.index');
    });

    // Areas
    Route::resource('areas', AreaController::class)->except(['show']);
    Route::post('areas/{areaId}/restore', [AreaController::class, 'restore'])->name('areas.restore');
    Route::post('areas/bulk-force-delete', [AreaController::class, 'bulkForceDelete'])->name('areas.bulk-force-delete');

    // Users
    Route::resource('users', UserController::class)->except(['show']);
    Route::post('users/{userId}/restore', [UserController::class, 'restore'])->name('users.restore');
    Route::post('users/bulk-force-delete', [UserController::class, 'bulkForceDelete'])->name('users.bulk-force-delete');

    // Settings
    Route::group(['prefix' => 'settings', 'as' => 'settings.'], function () {
        Route::resource('roles', RoleController::class)->except(['show']);
        Route::post('roles/{roleId}/restore', [RoleController::class, 'restore'])->name('roles.restore');
        Route::post('roles/bulk-force-delete', [RoleController::class, 'bulkForceDelete'])->name('roles.bulk-force-delete');

        Route::resource('labels', LabelController::class)->except(['show']);
        Route::post('labels/{labelId}/restore', [LabelController::class, 'restore'])->name('labels.restore');
        Route::post('labels/bulk-force-delete', [LabelController::class, 'bulkForceDelete'])->name('labels.bulk-force-delete');

        Route::resource('task-priorities', TaskPriorityController::class)->except(['show']);
        Route::post('task-priorities/{priorityId}/restore', [TaskPriorityController::class, 'restore'])->name('task-priorities.restore');
    });

    // Account
    Route::group(['prefix' => 'account', 'as' => 'account.'], function () {
        Route::get('profile', [ProfileController::class, 'edit'])->name('profile.edit');
        Route::put('profile', [ProfileController::class, 'update'])->name('profile.update');
    });

    // Notifications
    Route::get('notifications', [NotificationController::class, 'index'])->name('notifications');
    Route::put('notifications/{notification}/read', [NotificationController::class, 'read'])->name('notifications.read');
    Route::put('notifications/read/all', [NotificationController::class, 'readAll'])->name('notifications.read.all');
    Route::delete('notifications/read', [NotificationController::class, 'destroyRead'])->name('notifications.destroy.read');

    Route::get('dropdown/values', DropdownValuesController::class)->name('dropdown.values');
});