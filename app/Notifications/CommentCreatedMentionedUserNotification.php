<?php

namespace App\Notifications;

use App\Enums\Queue;
use App\Models\Comment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Carbon;

class CommentCreatedMentionedUserNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Comment $comment) {}

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
                ->whereJsonContains('data->task_id', $this->comment->task->id)
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
            ->subject("[{$this->comment->task->project->name}] Te han mencionado en un comentario.")
            ->greeting("{$this->comment->user->name} te ha mencionado en un comentario de la actividad {$this->comment->task->name}")
            ->line($this->comment->content)
            ->action('Abrir actividad', route('projects.tasks.open', ['project' => $this->comment->task->project_id, 'taskId' => $this->comment->task->id]));
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'task_id' => $this->comment->task->id,
            'title' => "{$this->comment->user->name} te ha mencionado en un comentario de la actividad\"{$this->comment->task->name}\" ",
            'subtitle' => "En el proyecto \"{$this->comment->task->project->name}\" ",
            'link' => route('projects.tasks.open', [$this->comment->task->project_id, $this->comment->task->id]),
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
