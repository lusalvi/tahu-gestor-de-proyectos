import { Group, Button, Text, Badge, Paper } from '@mantine/core';
import { IconArchive, IconX } from '@tabler/icons-react';
import useTasksStore from '@/hooks/store/useTasksStore';
import { openConfirmModal } from '@/components/ConfirmModal';
import { usePage } from '@inertiajs/react';

export default function BulkActionsBar() {
  const { project } = usePage().props;
  const {
    selectedTaskIds,
    clearTaskSelection,
    archiveSelectedTasks,
  } = useTasksStore();

  if (!can('archive task') || selectedTaskIds.length === 0) {
      return null;
  }

  const handleArchiveMultiple = () => {
    openConfirmModal({
      type: 'danger',
      title: '¿Archivar tareas?',
      content: `¿Estás seguro que deseas archivar ${selectedTaskIds.length} tarea(s)? Esta acción no se puede deshacer.`,
      confirmLabel: 'Archivar',
      cancelLabel: 'Cancelar',
      onConfirm: async () => {
        try {
          await archiveSelectedTasks(project.id);
        } catch (error) {
          console.error(error);
        }
      },
    });
  };

  return (
    <Paper
      withBorder
      shadow="xs"
      radius="md"
      p="md"
      mb="md"
    >
      <Group justify="space-between">
        <Group gap="sm">
          <Badge
            variant="light"
            size="lg"
          >
            {selectedTaskIds.length}
          </Badge>

          <Text fw={500}>
            {selectedTaskIds.length === 1
              ? 'actividad seleccionada'
              : 'actividades seleccionadas'}
          </Text>
        </Group>

        <Group>
          {can('archive task') && (
            <Button
              color="red"
              leftSection={<IconArchive size={16} />}
              onClick={handleArchiveMultiple}
            >
              Archivar
            </Button>
          )}

          <Button
            variant="default"
            leftSection={<IconX size={16} />}
            onClick={clearTaskSelection}
          >
            Limpiar selección
          </Button>
        </Group>
      </Group>
    </Paper>
  );
}