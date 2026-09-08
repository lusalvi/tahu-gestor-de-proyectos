import { Badge, Checkbox, Group, Text, ActionIcon } from '@mantine/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import IssueTypeIcon from '@/components/IssueTypeIcon';

import classes from './ListView.module.css';

import TaskAssigneeDropdown from './Components/TaskAssigneeDropdown';
import TaskDueDate from './Components/TaskDueDate';
import TaskActions from './Components/TaskActions';
import TaskStatusDropdown from './Components/TaskStatusDropdown';
import TaskCreator from './Components/TaskCreator';
import EditableTaskName from './Components/EditableTaskName';
import { IconChevronDown, IconChevronRight, IconGripVertical, IconPlus } from '@tabler/icons-react';
import useTaskDrawerStore from '@/hooks/store/useTaskDrawerStore';
import useTasksStore from '@/hooks/store/useTasksStore';
import { isOverdue, isDueSoon } from '@/utils/task';
import TaskPriorityDropdown from './Components/TaskPriorityDropdown';
import TaskDueDateDropdown from './Components/TaskDueDateDropdown';

function DropZone({ id, zone, isValid, className, children }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${id}-${zone}`,
    data: { taskId: id, zone },
  });

  const stateClass = isOver ? (isValid ? classes.dropValid : classes.dropInvalid) : '';

  return (
    <div
      ref={setNodeRef}
      className={`${className} ${stateClass}`}
    >
      {children}
    </div>
  );
}

export default function TaskRow({
  task,
  users,
  depth = 0,
  hasChildren,
  collapsed,
  onToggle,
  dragState,
}) {
  const { openEditTask, openCreateTask } = useTaskDrawerStore();
  const { selectedTaskIds, toggleTaskSelection } = useTasksStore();

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const isBeingDragged = dragState?.activeTask?.id === task.id;

  const overZone =
    dragState?.overState?.id === `${task.id}-before`
      ? 'before'
      : dragState?.overState?.id === `${task.id}-inside`
        ? 'inside'
        : dragState?.overState?.id === `${task.id}-after`
          ? 'after'
          : null;

  const isValidForZone = zone =>
    overZone === zone &&
    dragState?.activeTask &&
    dragState.isValidDropTarget(dragState.activeTask, task, zone);

  return (
    <div
      ref={setNodeRef}
      className={`${classes.row} ${isBeingDragged ? classes.rowDragging : ''}`}
      onClick={() => openEditTask(task)}
    >
      <div
        className={classes.dragHandle}
        {...attributes}
        {...listeners}
        onClick={e => e.stopPropagation()}
      >
        <IconGripVertical
          size={14}
          color='var(--mantine-color-gray-5)'
        />
      </div>

      <div className={classes.checkbox}>
          {can('archive task') && (
              <Checkbox
                  size='xs'
                  checked={selectedTaskIds.includes(task.id)}
                  onChange={() => toggleTaskSelection(task.id)}
                  onClick={e => e.stopPropagation()}
              />
          )}
      </div>

      <div className={classes.key}>
        <Text fw={500}>#{task.number}</Text>
      </div>

      <div className={`${classes.summary} ${task.parent_task_id ? classes.subtask : ''}`}>
        <DropZone
          id={task.id}
          zone='before'
          isValid={isValidForZone('before')}
          className={classes.dropZoneBefore}
        />

        <DropZone
          id={task.id}
          zone='inside'
          isValid={isValidForZone('inside')}
          className={classes.summaryContent}
        >
          <Group
            gap='xs'
            wrap='nowrap'
            ml={depth * 24}
          >
            <div
              className={`${classes.expandButton} ${hasChildren ? classes.expandButtonActive : ''}`}
              onClick={e => {
                e.stopPropagation();

                if (hasChildren) {
                  onToggle();
                }
              }}
            >
              {hasChildren &&
                (collapsed ? (
                  <IconChevronRight
                    size={14}
                    stroke={2}
                    color='var(--mantine-color-gray-6)'
                  />
                ) : (
                  <IconChevronDown
                    size={14}
                    stroke={2}
                    color='var(--mantine-color-gray-6)'
                  />
                ))}
            </div>

            <IssueTypeIcon type={task.issue_type} />

            <div
              style={{
                flex: 1,
                opacity: task.completed_at ? 0.6 : 1,
                textDecoration: task.completed_at ? 'line-through' : undefined,
                color:
                  task.completed_at
                    ? 'var(--mantine-color-gray-6)'
                    : isOverdue(task)
                    ? 'var(--mantine-color-red-7)'
                    : isDueSoon(task)
                    ? 'var(--mantine-color-yellow-7)'
                    : undefined,
              }}
              onClick={e => {
                // Permitir que EditableTaskName maneje el click
                if (e.target.tagName !== 'INPUT') {
                  openEditTask(task);
                }
              }}
            >
              <EditableTaskName task={task} />
            </div>
          </Group>

          {task.issue_type !== 'Subtarea' && (
            <div
              className={classes.summaryAction}
              onClick={e => {
                e.stopPropagation();

                openCreateTask({
                  group_id: task.group_id,
                  parent_task_id: task.id,
                  parent_issue_type: task.issue_type,
                });
              }}
            >
              <ActionIcon
                variant='subtle'
                size='sm'
              >
                <IconPlus size={16} />
              </ActionIcon>
            </div>
          )}
        </DropZone>

        <DropZone
          id={task.id}
          zone='after'
          isValid={isValidForZone('after')}
          className={classes.dropZoneAfter}
        />
      </div>

      <div className={classes.creator}>
        <TaskCreator user={task.created_by_user} />
      </div>

      <div
        className={classes.assignee}
        onClick={e => e.stopPropagation()}
      >
        <TaskAssigneeDropdown
          task={task}
          users={users}
        />
      </div>

      <div
        className={classes.priority}
        onClick={e => e.stopPropagation()}
      >
        <TaskPriorityDropdown task={task} />
      </div>

      <div
        className={classes.status}
        onClick={e => e.stopPropagation()}
      >
        <TaskStatusDropdown task={task} />
      </div>

      <div
        className={classes.due}
        onClick={e => e.stopPropagation()}
      >
        <TaskDueDateDropdown task={task} />
      </div>

      <div
        className={classes.actions}
        onClick={e => e.stopPropagation()}
      >
        <TaskActions task={task} />
      </div>
    </div>
  );
}