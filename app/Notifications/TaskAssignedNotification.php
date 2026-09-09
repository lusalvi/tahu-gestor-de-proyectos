<?php

namespace App\Notifications;

use App\Enums\Queue;
use App\Models\Task;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Carbon;

class TaskAssignedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Task $task) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail', 'database', 'broadcast'];
    }

    /**
     * Determine the notification's delivery delay.
     *
     * @return array<string, Carbon>
     */
    public function withDelay(object $notifiable): array
    {
        return [
            'mail' => now()->addMinutes(5),
        ];
    }

    /**
     * Determine which queues should be used for each notification channel.
     *
     * @return array<string, string>
     */
    public function viaQueues(): array
    {
        return [
            'mail' => Queue::EMAIL->value,
        ];
    }

    /**
     * Determine if the notification should be sent.
     */
    public function shouldSend(object $notifiable, string $channel): bool
    {
        if ($channel === 'mail') {
            return ! $notifiable
                ->readNotifications()
                ->whereJsonContains('data->task_id', $this->task->id)
                ->where('data->type', 'task_assigned')
                ->exists();
        }

        return true;
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject("[{$this->task->project->name}] Se te ha asignado una actividad")
            ->greeting("Hola {$notifiable->name},")
            ->line("{$this->task->createdByUser->name} te ha asignado la actividad \"{$this->task->name}\"")
            ->action('Abrir actividad', route('projects.tasks.open', ['project' => $this->task->project_id, 'taskId' => $this->task->id]))
            ->line($this->task->description);
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'task_assigned',
            'task_id' => $this->task->id,
            'title' => "Se te ha asignado la actividad \"{$this->task->name}\"",
            'subtitle' => "En el proyecto \"{$this->task->project->name}\" ",
            'link' => route('projects.tasks.open', [$this->task->project_id, $this->task->id]),
        ];
    }

    /**
     * Get the broadcastable representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toBroadcast(object $notifiable): array
    {
        $stored = $notifiable->notifications()->find($this->id);

        return [
            'id' => $this->id,
            ...$this->toArray($notifiable),
            'read_at' => null,
            'created_at' => $stored?->created_at?->toJSON() ?? now()->toJSON(),
        ];
    }
}
