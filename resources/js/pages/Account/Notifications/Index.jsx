import EmptyWithIcon from "@/components/EmptyWithIcon";
import Notification from "@/components/Notification";
import { openConfirmModal } from "@/components/ConfirmModal";
import useNotificationsStore from "@/hooks/store/useNotificationsStore";
import useToastStore from "@/hooks/store/useToastStore";
import ContainerBox from "@/layouts/ContainerBox";
import Layout from "@/layouts/MainLayout";
import { day, diffForHumans } from "@/utils/datetime";
import { checkTaskLinkStatus, redirectToUrl } from "@/utils/route";
import { router, usePage } from "@inertiajs/react";
import { ActionIcon, Center, Grid, Group, Stack, Text, Title, UnstyledButton } from "@mantine/core";
import { IconMessage, IconTrash } from "@tabler/icons-react";
import classes from "./css/Index.module.css";

const NotificationsIndex = () => {
  const { groups } = usePage().props;
  const { markAsRead, deleteRead } = useNotificationsStore();
  const { show: showToast } = useToastStore();
  const dates = Object.keys(groups);
  const hasReadNotifications = Object.values(groups)
    .flat()
    .some((item) => item.read_at !== null);

  const TASK_STATUS_NOTICE = {
    missing: {
      type: 'warning',
      title: 'Actividad no encontrada',
      message: 'La actividad a la que intentas acceder ya no existe. Es posible que haya sido eliminada',
    },
    archived: {
      type: 'info',
      title: 'Actividad archivada',
      message: 'Esta actividad fue archivada',
    },
  };

  const open = async (notification) => {
    if (notification.read_at === null) markAsRead(notification);

    const status = await checkTaskLinkStatus(notification.link);

    if (status !== 'active') {
      const notice = TASK_STATUS_NOTICE[status];
      showToast(notice);
      return;
    }

    redirectToUrl(notification.link);
  };

  const deleteAllRead = () => {
    openConfirmModal({
      type: "danger",
      title: "¿Eliminar notificaciones?",
      content: "Se eliminarán todas las notificaciones leídas. Esta acción no se puede deshacer.",
      confirmLabel: "Eliminar",
      cancelLabel: "Cancelar",
      confirmProps: { color: "red" },
      onConfirm: async () => {
        await deleteRead();
        router.reload({ only: ["groups"] });
      },
    });
  };

  return (
    <>
      <Grid justify="space-between" align="flex-end" gutter="xl" mb="lg">
        <Grid.Col span="auto">
          <Title order={1}>Notificaciones</Title>
        </Grid.Col>
        <Grid.Col span="content">
          {hasReadNotifications && (
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              onClick={deleteAllRead}
              aria-label="Eliminar notificaciones vistas"
            >
              <IconTrash size={18} />
            </ActionIcon>
          )}
        </Grid.Col>
      </Grid>

      <ContainerBox maw={550}>
        {dates.length ? (
          <Stack gap={20}>
            {dates.map((date) => (
              <div key={date}>
                <Group justify="space-between" align="center" mb={10}>
                  <Text fz={21} fw={600}>
                    {date}
                  </Text>
                  <div>
                    <Text fz={14} fw={500} align="right">
                      {day(groups[date][0].created_at)}
                    </Text>
                    <Text fz={11} c="dimmed" mt={-2}>
                      {diffForHumans(groups[date][0].created_at)}
                    </Text>
                  </div>
                </Group>
                <Stack gap={14}>
                  {groups[date].map((item) => (
                    <UnstyledButton
                      key={item.id}
                      onClick={() => open(item)}
                      opacity={item.read_at ? 0.5 : 1}
                      className={classes.notification}
                    >
                      <Notification
                        title={item.title}
                        subtitle={item.subtitle}
                        datetime={item.created_at}
                        read={item.read_at !== null}
                      />
                    </UnstyledButton>
                  ))}
                </Stack>
              </div>
            ))}
          </Stack>
        ) : (
          <Center mih={160}>
            <EmptyWithIcon
              title="Sin notificaciones"
              subtitle="Lista vacía, no hay notificaciones para mostrar."
              icon={IconMessage}
            />
          </Center>
        )}
      </ContainerBox>
    </>
  );
};

NotificationsIndex.layout = (page) => <Layout title="Notifications">{page}</Layout>;

export default NotificationsIndex;
