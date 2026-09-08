import { openConfirmModal } from '@/components/ConfirmModal';
import Dropzone from '@/components/Dropzone';
import RichTextEditor from '@/components/RichTextEditor';
import useTaskDrawerStore from '@/hooks/store/useTaskDrawerStore';
import useForm from '@/hooks/useForm';
import { ALLOWED_CHILD_TYPES } from '@/utils/taskHierarchy';
import { usePage } from '@inertiajs/react';
import {
  Button,
  Drawer,
  Flex,
  MultiSelect,
  Select,
  Text,
  TextInput,
  rem,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useEffect, useRef } from 'react';
import LabelsDropdown from './LabelsDropdown';
import PriorityDropdown from './PriorityDropdown';
import classes from './css/TaskDrawer.module.css';

export function CreateTaskDrawer() {
  const { create, closeCreateTask } = useTaskDrawerStore();
  const {
    usersWithAccessToProject,
    taskGroups,
    labels,
    project,
    auth: { user },
  } = usePage().props;

  const drawerId = useRef(0);
  useEffect(() => {
    if (create.opened) {
      drawerId.current += 1;
    }
  }, [create.opened]);

  const forcedChildType = (() => {
    const options = ALLOWED_CHILD_TYPES[create.parent_issue_type] ?? [];
    return options.length === 1 ? options[0] : null;
  })();

  const initial = {
    group_id: create.group_id ? create.group_id.toString() : '',
    assigned_to_user_id: '',
    name: '',
    description: '',
    issue_type: create.issue_type || '',
    parent_task_id: create.parent_task_id,
    priority_id: null,
    start_on: '',
    due_on: '',
    subscribed_users: [user.id.toString()],
    labels: [],
    attachments: [],
  };

  const [form, submit, updateValue] = useForm(
    'post',
    route('projects.tasks.store', [route().params.project]),
    {
      ...initial,
    }
  );

  useEffect(() => {
    if (create.opened) {
      const resolvedIssueType = forcedChildType || create.issue_type || '';
      form.setData({
        group_id: create.group_id ? create.group_id.toString() : '',
        assigned_to_user_id: '',
        name: '',
        description: '',
        issue_type: resolvedIssueType,
        parent_task_id: create.parent_task_id,
        priority_id: null,
        start_on: '',
        due_on: '',
        subscribed_users: [user.id.toString()],
        labels: [],
        attachments: [],
      });
      form.clearErrors();
    }
  }, [create.opened, create.group_id, create.issue_type, create.parent_task_id]);

  const closeDrawer = (force = false) => {
    const isEmpty = (
      form.data.name === '' &&
      form.data.description === '' &&
      form.data.assigned_to_user_id === '' &&
      form.data.start_on === '' &&
      form.data.due_on === '' &&
      form.data.labels.length === 0 &&
      form.data.priority_id === null &&
      form.data.attachments.length === 0
    );
    
    if (force || (isEmpty && !form.processing)) {
      closeCreateTask();
    } else {
      openConfirmModal({
        type: 'danger',
        title: '¿Deseas descartar los cambios?',
        content: `Si cierras este formulario, se perderán todos los cambios realizados en la actividad.`,
        confirmLabel: 'Descartar cambios',
        cancelLabel: 'Cancelar',
        confirmProps: { color: 'red' },
        onConfirm: () => closeCreateTask(),
      });
    }
  };

  const ISSUE_TYPE_LABELS = {
    Epica: 'Épica',
    Historia: 'Historia',
    Tarea: 'Tarea',
    Subtarea: 'Subtarea',
  };

  const availableIssueTypes = create.parent_issue_type
    ? (ALLOWED_CHILD_TYPES[create.parent_issue_type] ?? []).map(type => ({
        value: type,
        label: ISSUE_TYPE_LABELS[type],
      }))
    : Object.keys(ISSUE_TYPE_LABELS)
        .filter(type => type !== 'Subtarea')
        .map(type => ({
          value: type,
          label: ISSUE_TYPE_LABELS[type],
        }));

  const removeAttachment = index => {
    const files = [...form.data.attachments];
    files.splice(index, 1);
    updateValue('attachments', files);
  };

  return (
    <Drawer
      key={`drawer-${drawerId.current}`}
      opened={create.opened}
      onClose={closeDrawer}
      title={
        <Text
          fz={{ base: 'lg', sm: rem(28) }}
          fw={600}
          ml={{ base: 0, sm: 25 }}
          my='sm'
        >
          Crear nueva actividad
        </Text>
      }
      position='right'
      size={1000}
      overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
      transitionProps={{
        transition: 'slide-left',
        duration: 400,
        timingFunction: 'ease',
      }}
    >
      <form
        onSubmit={event => {
          submit(event, {
            transform: data => ({
              ...data,
              parent_task_id: create.parent_task_id,
              issue_type: forcedChildType || data.issue_type,
            }),
            onSuccess: () => closeDrawer(true),
            forceFormData: true,
          });
        }}
        className={classes.inner}
      >

        {/* Contenido */}
        <div className={classes.content}>

          {/* Nombre */}
          <TextInput
            className={classes.nameField}
            label="Nombre"
            placeholder="Nombre de la actividad"
            required
            data-autofocus
            value={form.data.name}
            onChange={e => updateValue("name", e.target.value)}
            error={form.errors.name}
          />

          <RichTextEditor
            placeholder="Descripción de la actividad"
            height={260}
            value={form.data.description}
            onChange={content => updateValue("description", content)}
          />

          <Dropzone
            mt="xs"
            selected={form.data.attachments}
            onChange={files => updateValue("attachments", files)}
            remove={index => removeAttachment(index)}
          />

        <MultiSelect
          className={classes.subscribers}
          label="Suscriptores"
          placeholder="Selecciona suscriptores"
          searchable
          mt="sm"
          value={form.data.subscribed_users}
          onChange={values => updateValue("subscribed_users", values)}
          data={usersWithAccessToProject.map(i => ({
            value: i.id.toString(),
            label: i.name,
          }))}
          error={form.errors.subscribed_users}
        />

          <Flex
            justify="space-between"
            mt="xs"
          >
            <Button
              variant="transparent"
              w={100}
              disabled={form.processing}
              onClick={closeDrawer}
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              w={120}
              loading={form.processing}
            >
              Crear
            </Button>
          </Flex>

        </div>

        {/* Sidebar */}
        <div className={classes.sidebar}>

          <Select
            label="Estado"
            placeholder="Selecciona el estado"
            required
            value={form.data.group_id}
            onChange={value => updateValue("group_id", value)}
            data={taskGroups.map(i => ({
              value: i.id.toString(),
              label: i.name,
            }))}
            error={form.errors.group_id}
            size="sm"
          />

          <Select
            label="Tipo"
            placeholder="Selecciona el tipo de actividad"
            required
            value={form.data.issue_type}
            onChange={value => updateValue("issue_type", value || "")}
            data={availableIssueTypes}
            disabled={Boolean(forcedChildType)}
            error={form.errors.issue_type}
            size="sm"
          />

          <Select
            label="Responsable"
            placeholder="Selecciona un responsable"
            searchable
            value={form.data.assigned_to_user_id}
            onChange={value => updateValue("assigned_to_user_id", value || '')}
            data={usersWithAccessToProject.map(i => ({
              value: i.id.toString(),
              label: i.name,
            }))}
            error={form.errors.assigned_to_user_id}
            size="sm"
          />

          <DateInput
            clearable
            valueFormat="DD MMM YYYY"
            label="Fecha de inicio"
            placeholder="Selecciona la fecha de inicio"
            value={form.data.start_on || null}
            onChange={value => updateValue("start_on", value || "")}
            size="sm"
          />

          <DateInput
            clearable
            valueFormat="DD MMM YYYY"
            minDate={new Date()}
            label="Fecha de vencimiento"
            placeholder="Selecciona la fecha de vencimiento"
            value={form.data.due_on || null}
            onChange={value => updateValue("due_on", value || "")}
            size="sm"
          />

          <LabelsDropdown
            items={labels}
            selected={form.data.labels}
            onChange={values => updateValue("labels", values)}
          />

          <PriorityDropdown
            value={form.data.priority_id}
            onChange={value => updateValue("priority_id", value || null)}
          />

        </div>

      </form>
    </Drawer>
  );
}