import Layout from '@/layouts/MainLayout';
import {
  currentUrl,
  currentUrlParams,
  reloadWithQuery,
  reloadWithoutQueryParams,
} from '@/utils/route';
import { router, usePage } from '@inertiajs/react';
import {
  ActionIcon,
  Box,
  Button,
  Center,
  Checkbox,
  ColorSwatch,
  Combobox,
  Drawer,
  Group,
  Input,
  InputBase,
  Loader,
  Menu,
  Modal,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
  useCombobox,
  rem,
} from '@mantine/core';
import { DateInput, TimeInput } from '@mantine/dates';
import { useDisclosure } from '@mantine/hooks';
import {
  IconAdjustmentsHorizontal,
  IconCalendar,
  IconCalendarCheck,
  IconChevronLeft,
  IconChevronRight,
  IconCircleCheckFilled,
  IconClock,
  IconClockExclamation,
  IconPencil,
  IconPlus,
  IconSun,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { useState } from 'react';
import classes from './css/Index.module.css';

dayjs.locale('es');

// ─── Helpers ──────────────────────────────────────────────────────

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─── PrioritySelect ───────────────────────────────────────────────

function PrioritySelect({ value, onChange, priorities }) {
  const combobox = useCombobox({ onDropdownClose: () => combobox.resetSelectedOption() });
  const selected = priorities?.find(p => p.id === value) ?? null;

  return (
    <Box>
      <Input.Label>Prioridad</Input.Label>
      <Combobox
        store={combobox}
        onOptionSubmit={val => {
          onChange(val ? Number(val) : null);
          combobox.closeDropdown();
        }}
        withinPortal={false}
      >
        <Combobox.Target>
          <InputBase
            component='button'
            type='button'
            pointer
            size='sm'
            onClick={() => combobox.toggleDropdown()}
            rightSection={
              selected ? (
                <IconX
                  size={14}
                  style={{ cursor: 'pointer' }}
                  onClick={e => {
                    e.stopPropagation();
                    onChange(null);
                  }}
                />
              ) : (
                <Combobox.Chevron />
              )
            }
            rightSectionPointerEvents={selected ? 'all' : 'none'}
          >
            {selected ? (
              <Group gap={7}>
                <ColorSwatch
                  color={selected.color}
                  size={10}
                />
                <Text size='sm'>{selected.label}</Text>
              </Group>
            ) : (
              <Input.Placeholder>Sin prioridad</Input.Placeholder>
            )}
          </InputBase>
        </Combobox.Target>
        <Combobox.Dropdown>
          <Combobox.Options>
            {priorities?.map(p => (
              <Combobox.Option
                key={p.id}
                value={p.id.toString()}
                active={value === p.id}
              >
                <Group gap={7}>
                  <ColorSwatch
                    color={p.color}
                    size={10}
                  />
                  <Text size='sm'>{p.label}</Text>
                </Group>
              </Combobox.Option>
            ))}
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>
    </Box>
  );
}

// ─── Drawer crear / editar ────────────────────────────────────────

function TaskDrawer({ opened, onClose, task, priorities, viewingDate }) {
  const isEditing = Boolean(task);
  const empty = {
    description: '',
    notes: '',
    priority_id: null,
    scheduled_for: viewingDate,
    scheduled_time: '',
  };
  const [form, setForm] = useState(empty);
  const [submitting, setSubmitting] = useState(false);

  const [prevOpened, setPrevOpened] = useState(false);
  if (opened !== prevOpened) {
    setPrevOpened(opened);
    if (opened) {
      setForm(
        isEditing
          ? {
              description: task.description ?? '',
              notes: task.notes ?? '',
              priority_id: task.priority_id ?? null,
              scheduled_for: task.scheduled_for ? task.scheduled_for.split('T')[0] : viewingDate,
              scheduled_time: task.scheduled_time ?? '',
            }
          : { ...empty, scheduled_for: viewingDate }
      );
    }
  }

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.description.trim()) return;
    setSubmitting(true);
    const payload = {
      description: form.description.trim(),
      notes: form.notes.trim() || null,
      priority_id: form.priority_id || null,
      scheduled_for: form.scheduled_for || viewingDate,
      scheduled_time: form.scheduled_time || null,
    };
    const opts = {
      preserveScroll: true,
      onSuccess: () => onClose(),
      onFinish: () => setSubmitting(false),
    };
    if (isEditing) {
      router.put(route('personal-tasks.update', task.id), payload, opts);
    } else {
      router.post(route('personal-tasks.store'), payload, opts);
    }
  }

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={
        <Text
          fz={{ base: 'lg', sm: rem(22) }}
          fw={600}
          ml={{ base: 0, sm: 25 }}
          my='sm'
        >
          {isEditing ? 'Editar tarea' : 'Nueva tarea'}
        </Text>
      }
      position='right'
      size={520}
      overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
      transitionProps={{ transition: 'slide-left', duration: 400, timingFunction: 'ease' }}
    >
      <form
        onSubmit={handleSubmit}
        className={classes.drawerForm}
      >
        <div className={classes.drawerContent}>
          <TextInput
            label='Título'
            placeholder='¿Qué tenés que hacer?'
            required
            data-autofocus
            value={form.description}
            onChange={e => update('description', e.target.value)}
            size='sm'
          />
          <Textarea
            label='Descripción'
            description='Opcional. Detalles, contexto o notas sobre la tarea.'
            placeholder='Detalles adicionales...'
            value={form.notes}
            onChange={e => update('notes', e.target.value)}
            autosize
            minRows={3}
            maxRows={8}
            size='sm'
          />
          <PrioritySelect
            value={form.priority_id}
            onChange={val => update('priority_id', val)}
            priorities={priorities}
          />
          <Group
            grow
            align='flex-end'
          >
            <DateInput
              label='Fecha'
              valueFormat='DD MMM YYYY'
              placeholder='Seleccioná una fecha'
              value={form.scheduled_for ? dayjs(form.scheduled_for).toDate() : null}
              onChange={val =>
                update('scheduled_for', val ? dayjs(val).format('YYYY-MM-DD') : viewingDate)
              }
              size='sm'
              clearable
            />
            <Box>
              <Input.Label>
                Hora{' '}
                <Text
                  span
                  size='xs'
                  c='dimmed'
                >
                  (opcional)
                </Text>
              </Input.Label>
              <TimeInput
                placeholder='15:30'
                value={form.scheduled_time}
                onChange={e => update('scheduled_time', e.target.value)}
                size='sm'
                rightSection={
                  form.scheduled_time ? (
                    <IconX
                      size={14}
                      style={{ cursor: 'pointer' }}
                      onClick={() => update('scheduled_time', '')}
                    />
                  ) : null
                }
                rightSectionPointerEvents='all'
              />
            </Box>
          </Group>
        </div>
        <Group
          justify='space-between'
          mt='xl'
          px={rem(20)}
          pb={rem(20)}
        >
          <Button
            variant='transparent'
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            type='submit'
            loading={submitting}
            disabled={!form.description.trim()}
          >
            {isEditing ? 'Guardar cambios' : 'Agregar tarea'}
          </Button>
        </Group>
      </form>
    </Drawer>
  );
}

// ─── Fila de tarea ────────────────────────────────────────────────

function TaskRow({ task, onEdit, isOverdue }) {
  const [optimisticCompleted, setOptimisticCompleted] = useState(null);
  const [toggling, setToggling] = useState(false);
  const [confirmDelete, { open: openDelete, close: closeDelete }] = useDisclosure(false);

  const isCompleted =
    optimisticCompleted !== null ? optimisticCompleted : task.completed_at !== null;

  function handleToggle() {
    const next = !isCompleted;
    setOptimisticCompleted(next);
    setToggling(true);
    router.post(
      route('personal-tasks.toggle', task.id),
      {},
      {
        preserveScroll: true,
        headers: { 'X-Silent': 'true' },
        onError: () => {
          setOptimisticCompleted(null);
          setToggling(false);
        },
        onFinish: () => {
          setToggling(false);
          setOptimisticCompleted(null);
        },
      }
    );
  }

  function handleDelete() {
    router.delete(route('personal-tasks.destroy', task.id), {
      preserveScroll: true,
      onSuccess: () => closeDelete(),
    });
  }

  const priorityColor = task.priority?.color ?? null;
  const priorityLabel = task.priority?.label ?? null;

  // Etiqueta de fecha/hora en la fila
  let dateLabel;
  let DateIcon = IconCalendar;

  if (isCompleted && task.completed_at) {
    DateIcon = IconClock;
    dateLabel = `Completada hoy · ${dayjs(task.completed_at).format('H:mm')}`;
  } else if (isOverdue && task.scheduled_for) {
    const sf = dayjs(task.scheduled_for);
    const diffDays = dayjs().startOf('day').diff(sf.startOf('day'), 'day');
    const dateStr = diffDays === 1 ? `ayer (${sf.format('D/MM')})` : sf.format('D/MM');
    dateLabel = task.scheduled_time
      ? `${capitalize(dateStr)} · ${task.scheduled_time.slice(0, 5)}`
      : capitalize(dateStr);
  } else {
    dateLabel = task.scheduled_time ? `Hoy · ${task.scheduled_time.slice(0, 5)}` : 'Hoy';
  }

  return (
    <>
      <div className={`${classes.taskRow} ${isCompleted ? classes.taskRowCompleted : ''}`}>
        {/* Checkbox */}
        <div className={classes.taskCheck}>
          {toggling ? (
            <Loader size={14} />
          ) : (
            <Checkbox
              checked={isCompleted}
              onChange={handleToggle}
              radius='sm'
              size='sm'
            />
          )}
        </div>

        {/* Título + notas */}
        <div className={classes.taskBody}>
          <Text
            size='sm'
            fw={isCompleted ? 400 : 500}
            c={isCompleted ? 'dimmed' : undefined}
            td={isCompleted ? 'line-through' : undefined}
            className={classes.taskTitle}
          >
            {task.description}
          </Text>
          {task.notes && (
            <Text
              size='xs'
              c='dimmed'
              lineClamp={1}
              className={classes.taskNotes}
            >
              {task.notes}
            </Text>
          )}
        </div>

        {/* Prioridad */}
        {priorityColor && (
          <div className={classes.taskMeta}>
            <ColorSwatch
              color={priorityColor}
              size={8}
            />
            <Text
              size='xs'
              c='dimmed'
            >
              {priorityLabel}
            </Text>
          </div>
        )}

        {/* Fecha / hora */}
        <div className={`${classes.taskMeta} ${classes.taskDate}`}>
          <DateIcon
            size={13}
            className={classes.metaIcon}
          />
          <Text
            size='xs'
            c='dimmed'
          >
            {dateLabel}
          </Text>
        </div>

        {/* Menú ⋮ */}
        <Menu
          shadow='md'
          position='bottom-end'
          withinPortal
        >
          <Menu.Target>
            <ActionIcon
              variant='subtle'
              color='gray'
              size='sm'
              className={classes.menuTrigger}
            >
              <svg
                width='14'
                height='14'
                viewBox='0 0 24 24'
                fill='currentColor'
              >
                <circle
                  cx='12'
                  cy='5'
                  r='1.5'
                />
                <circle
                  cx='12'
                  cy='12'
                  r='1.5'
                />
                <circle
                  cx='12'
                  cy='19'
                  r='1.5'
                />
              </svg>
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            {!isCompleted && (
              <Menu.Item
                leftSection={<IconPencil size={13} />}
                onClick={() => onEdit(task)}
              >
                Editar
              </Menu.Item>
            )}
            <Menu.Item
              leftSection={<IconTrash size={13} />}
              color='red'
              onClick={openDelete}
            >
              Eliminar
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </div>

      <Modal
        opened={confirmDelete}
        onClose={closeDelete}
        title='Eliminar tarea'
        size='sm'
      >
        <Text
          size='sm'
          mb='lg'
        >
          ¿Eliminar "{task.description}"? Esta acción no se puede deshacer.
        </Text>
        <Group justify='flex-end'>
          <Button
            variant='default'
            onClick={closeDelete}
          >
            Cancelar
          </Button>
          <Button
            color='red'
            onClick={handleDelete}
          >
            Eliminar
          </Button>
        </Group>
      </Modal>
    </>
  );
}

// ─── Cabecera de sección ──────────────────────────────────────────

function SectionHeader({ variant, icon: Icon, label, count, sublabel, extra }) {
  return (
    <div className={`${classes.sectionHeader} ${classes[`sectionHeader--${variant}`]}`}>
      <Group
        justify='space-between'
        align='center'
        wrap='nowrap'
      >
        <Group
          gap='sm'
          align='flex-start'
        >
          <div className={`${classes.sectionIconWrap} ${classes[`sectionIconWrap--${variant}`]}`}>
            {Icon && <Icon size={15} />}
          </div>
          <div>
            <Group
              gap={6}
              align='baseline'
            >
              <Text
                size='sm'
                fw={600}
              >
                {label}
              </Text>
              <Text
                size='xs'
                c='dimmed'
              >
                ({count})
              </Text>
            </Group>
            {sublabel && (
              <Text
                size='xs'
                c='dimmed'
              >
                {sublabel}
              </Text>
            )}
          </div>
        </Group>
        {extra}
      </Group>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────

const PersonalTasksIndex = () => {
  const { dateTasks, overdueTasks, completedTasks, priorities, viewingDate, today, isToday } =
    usePage().props;

  const params = currentUrlParams();
  const prioritySort = params.sort_priority ?? null;

  const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);
  const [editingTask, setEditingTask] = useState(null);

  function handleNewTask() {
    setEditingTask(null);
    openDrawer();
  }
  function handleEdit(task) {
    setEditingTask(task);
    openDrawer();
  }
  function handleDrawerClose() {
    closeDrawer();
    setEditingTask(null);
  }

  // Navegación entre fechas
  function navigateTo(dateStr) {
    const newParams = { ...params };

    if (dateStr === today) {
      delete newParams.date;
    } else {
      newParams.date = dateStr;
    }

    router.get(currentUrl(), newParams, {
      preserveState: false,
      preserveScroll: true,
      replace: true,
    });
  }

  function goToPrev() {
    navigateTo(dayjs(viewingDate).subtract(1, 'day').format('YYYY-MM-DD'));
  }

  function goToNext() {
    navigateTo(dayjs(viewingDate).add(1, 'day').format('YYYY-MM-DD'));
  }

  function goToToday() {
    navigateTo(today);
  }

  // Ordenamiento
  const sortOptions = [
    { value: 'default', label: 'Predeterminado' },
    { value: 'asc', label: 'Alta → Baja' },
    { value: 'desc', label: 'Baja → Alta' },
  ];

  function handleSortChange(val) {
    if (!val || val === 'default') reloadWithoutQueryParams({ exclude: ['sort_priority'] });
    else reloadWithQuery({ sort_priority: val }, true);
  }

  const [clearingCompleted, setClearingCompleted] = useState(false);
  function handleClearCompleted() {
    setClearingCompleted(true);
    router.delete(route('personal-tasks.clear-completed'), {
      data: { date: viewingDate },
      preserveScroll: true,
      onFinish: () => setClearingCompleted(false),
    });
  }

  const hasAnything = dateTasks.length > 0 || overdueTasks.length > 0 || completedTasks.length > 0;

  // Etiqueta de la fecha visualizada
  const viewingDayjs = dayjs(viewingDate);
  const dateLabel = isToday
    ? capitalize(viewingDayjs.format('dddd, D [de] MMMM [de] YYYY'))
    : capitalize(viewingDayjs.format('dddd, D [de] MMMM [de] YYYY'));

  // Sublabel de la sección "Para hoy" cambia según si estamos viendo hoy u otro día
  const dateSectionLabel = isToday ? 'Para hoy' : `Para el ${viewingDayjs.format('D [de] MMMM')}`;
  const dateSectionSublabel = isToday
    ? 'Tareas programadas para el día de hoy.'
    : `Tareas programadas para este día.`;

  return (
    <>
      {/* Cabecera */}
      <div className={classes.pageHeader}>
        <Title
          order={2}
          fw={700}
        >
          Tareas Personales
        </Title>
        <Text
          size='sm'
          c='dimmed'
        >
          Tus tareas y pendientes del día a día.
        </Text>
      </div>

      {/* Toolbar: navegación de fecha | ordenamiento + botón */}
      <div className={classes.toolbar}>
        {/* Navegación de fecha */}
        <Group
          gap='xs'
          align='center'
        >
          <ActionIcon
            variant='subtle'
            color='gray'
            size='sm'
            onClick={goToPrev}
          >
            <IconChevronLeft size={15} />
          </ActionIcon>

          <Group
            gap={6}
            align='center'
            className={classes.dateChip}
          >
            <IconCalendarCheck
              size={14}
              className={classes.dateChipIcon}
            />
            <Text
              size='sm'
              fw={500}
            >
              {dateLabel}
            </Text>
          </Group>

          <ActionIcon
            variant='subtle'
            color='gray'
            size='sm'
            onClick={goToNext}
          >
            <IconChevronRight size={15} />
          </ActionIcon>

          {!isToday && (
            <Button
              size='xs'
              variant='light'
              onClick={goToToday}
            >
              Hoy
            </Button>
          )}
        </Group>

        {/* Ordenamiento + nueva tarea */}
        <Group
          gap='md'
          align='center'
        >
          <Group
            gap='xs'
            align='center'
          >
            <IconAdjustmentsHorizontal
              size={14}
              color='var(--mantine-color-dimmed)'
            />
            <Text
              size='xs'
              c='dimmed'
              fw={500}
            >
              Ordenar por:
            </Text>
            <Select
              size='xs'
              data={sortOptions}
              value={prioritySort ?? 'default'}
              onChange={handleSortChange}
              w={165}
              allowDeselect={false}
            />
          </Group>
          <Button
            leftSection={<IconPlus size={15} />}
            onClick={handleNewTask}
            size='sm'
          >
            Nueva tarea
          </Button>
        </Group>
      </div>

      {/* Lista */}
      <Box className={classes.taskList}>
        {!hasAnything ? (
          <Center mih={200}>
            <Stack
              align='center'
              gap='xs'
            >
              <IconCalendarCheck
                size={38}
                strokeWidth={1.2}
                color='var(--mantine-color-dimmed)'
              />
              <Text
                c='dimmed'
                size='sm'
                ta='center'
              >
                No hay tareas para este día.
                <br />
                Usá "Nueva tarea" para agregar una.
              </Text>
            </Stack>
          </Center>
        ) : (
          <Stack gap='sm'>
            {/* Pendientes anteriores — solo al ver hoy */}
            {overdueTasks.length > 0 && (
              <div className={classes.section}>
                <SectionHeader
                  variant='overdue'
                  icon={IconClockExclamation}
                  label='Pendientes anteriores'
                  count={overdueTasks.length}
                  sublabel='Tareas que aún no completaste y estaban programadas para días previos.'
                />
                <div className={classes.sectionBody}>
                  {overdueTasks.map(task => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onEdit={handleEdit}
                      isOverdue
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Tareas del día */}
            {dateTasks.length > 0 && (
              <div className={classes.section}>
                <SectionHeader
                  variant='today'
                  icon={IconSun}
                  label={dateSectionLabel}
                  count={dateTasks.length}
                  sublabel={dateSectionSublabel}
                />
                <div className={classes.sectionBody}>
                  {dateTasks.map(task => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onEdit={handleEdit}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Completadas */}
            {completedTasks.length > 0 && (
              <div className={classes.section}>
                <SectionHeader
                  variant='completed'
                  icon={IconCircleCheckFilled}
                  label='Completadas'
                  count={completedTasks.length}
                  sublabel='Tareas que completaste este día.'
                  extra={
                    <Button
                      variant='subtle'
                      color='red'
                      size='xs'
                      leftSection={<IconTrash size={12} />}
                      loading={clearingCompleted}
                      onClick={handleClearCompleted}
                    >
                      Limpiar tareas completadas
                    </Button>
                  }
                />
                <div className={classes.sectionBody}>
                  {completedTasks.map(task => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onEdit={handleEdit}
                    />
                  ))}
                </div>
              </div>
            )}
          </Stack>
        )}
      </Box>

      <TaskDrawer
        opened={drawerOpened}
        onClose={handleDrawerClose}
        task={editingTask}
        priorities={priorities}
        viewingDate={viewingDate}
      />
    </>
  );
};

PersonalTasksIndex.layout = page => <Layout title='Tareas Personales'>{page}</Layout>;

export default PersonalTasksIndex;