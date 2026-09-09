import EmptyWithIcon from '@/components/EmptyWithIcon';
import Notification from '@/components/Notification';
import useNotificationsStore from '@/hooks/store/useNotificationsStore';
import useToastStore from '@/hooks/store/useToastStore';
import { checkTaskLinkStatus, redirectTo, redirectToUrl } from '@/utils/route';

import {
  ActionIcon,
  Affix,
  Center,
  Group,
  Indicator,
  Menu,
  Title,
  UnstyledButton,
} from '@mantine/core';

import { useMediaQuery } from '@mantine/hooks';
import { IconMessage } from '@tabler/icons-react';

import classes from './css/Notifications.module.css';
import AppIcon from '@/components/AppIcon';

export default function Notifications() {
  const mobile = useMediaQuery('(max-width: 768px)');

  const {
    notifications,
    markAsRead,
    markAllAsRead,
  } = useNotificationsStore();

  const { show: showToast } = useToastStore();

  const unreadCount = notifications.filter(
    n => n.read_at === null
  ).length;

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

  const open = async notification => {
    if (notification.read_at === null) {
      markAsRead(notification);
    }

    const status = await checkTaskLinkStatus(notification.link);

    if (status !== 'active') {
      const notice = TASK_STATUS_NOTICE[status];
      showToast(notice);
      return;
    }

    redirectToUrl(notification.link);
  };

  return (
    <Affix
      position={{
        top: 20,
        right: 20,
      }}
      zIndex={100}
    >
      <Menu
        withArrow
        position="bottom-end"
        withinPortal
        shadow="md"
        transitionProps={{
          duration: 120,
          transition: 'pop-top-right',
        }}
        offset={{
          mainAxis: 10,
          alignmentAxis: 8,
        }}
      >
        <Indicator
          color="red"
          disabled={unreadCount === 0}
          label={unreadCount}
          offset={3}
          size={16}
          className={classes.indicator}
        >
          <Menu.Target>
            <ActionIcon
              radius="xl"
              size="lg"
              variant="filled"
            >
              <AppIcon
                name="notifications"
                filled
                size={20}
              />
            </ActionIcon>
          </Menu.Target>

          <Menu.Dropdown
            p={12}
            miw={mobile ? 300 : 340}
            maw={mobile ? 'calc(100vw - 24px)' : 400}
          >
            <Group
              justify="space-between"
              m={10}
              ml={15}
            >
              <Title order={4}>
                Notificaciones
              </Title>

              {unreadCount > 0 && (
                <UnstyledButton
                  fz={11}
                  onClick={markAllAsRead}
                  className={classes.link}
                >
                  Marcar todas como leídas
                </UnstyledButton>
              )}
            </Group>

            <Menu.Divider />

            {notifications.length ? (
              notifications.map(notification => (
                <Menu.Item
                  key={notification.id}
                  onClick={() => open(notification)}
                  opacity={notification.read_at ? 0.6 : 1}
                  className={classes.notification}
                >
                  <Notification
                    title={notification.title}
                    subtitle={notification.subtitle}
                    datetime={notification.created_at}
                    read={notification.read_at !== null}
                  />
                </Menu.Item>
              ))
            ) : (
              <Center mih={100}>
                <EmptyWithIcon
                  title="Las notificaciones recientes"
                  subtitle="Aparecerán aquí."
                  icon={IconMessage}
                  titleFontSize={17}
                  subtitleFontSize={13}
                  iconSize={38}
                />
              </Center>
            )}

            <Menu.Divider />

            <UnstyledButton
              fz={13}
              fw={500}
              onClick={() => redirectTo('notifications')}
              mx={13}
              my={6}
              className={classes.link}
            >
              Ver todas mis notificaciones
            </UnstyledButton>
          </Menu.Dropdown>
        </Indicator>
      </Menu>
    </Affix>
  );
}
