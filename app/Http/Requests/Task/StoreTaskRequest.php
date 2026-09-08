<?php

namespace App\Http\Requests\Task;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreTaskRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string:255'],
            'group_id' => ['required', 'exists:task_groups,id'],
            'assigned_to_user_id' => ['nullable', 'exists:users,id'],
            'description' => ['nullable'],
            'parent_task_id' => [
                'nullable',
                'exists:tasks,id',
                'required_if:issue_type,Subtarea',
            ],
            'issue_type' => ['required', 'in:Epica,Historia,Tarea,Subtarea'],
            'priority_id' => ['nullable', 'exists:task_priorities,id'],
            'start_on' => ['nullable', 'date'],
            'due_on' => ['nullable', 'date', 'after_or_equal:start_on'],
            'subscribed_users' => ['array'],
            'labels' => ['array'],
            'attachments' => ['array'],
        ];
    }
}
