<?php

namespace App\Notifications;

use App\Enums\Queue;
use App\Models\Task;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TaskDueSoonNotification extends Notification implements ShouldQueue
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
        return ['mail', 'database'];
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
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject("[{$this->task->project->name}] La actividad \"{$this->task->name}\" vence mañana")
            ->greeting("Hola {$notifiable->name},")
            ->line("La actividad \"{$this->task->name}\" vence mañana ({$this->task->due_on->format('d/m/Y')}).")
            ->action('Abrir actividad', route('projects.tasks.open', ['project' => $this->task->project_id, 'taskId' => $this->task->id]))
            ->line('Completar antes de su vencimiento.');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'task_id' => $this->task->id,
            'title' => "\"{$this->task->name}\" vence mañana",
            'subtitle' => "En el proyecto \"{$this->task->project->name}\" ",
            'link' => route('projects.tasks.open', [$this->task->project_id, $this->task->id]),
        ];
    }
}
