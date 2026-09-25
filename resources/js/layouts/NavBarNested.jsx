import Logo from '@/components/Logo';
import AppIcon from '@/components/AppIcon';
import useNavigationStore from '@/hooks/store/useNavigationStore';
import { ActionIcon, Group, ScrollArea, rem } from '@mantine/core';
import { useEffect } from 'react';
import NavbarLinksGroup from './NavbarLinksGroup';
import UserButton from './UserButton';
import classes from './css/NavBarNested.module.css';

export default function Sidebar({ closeDrawer = () => {}, mobile = false }) {
  const { items, setItems } = useNavigationStore();

  useEffect(() => {
    setItems([
      {
        label: 'Dashboard',
        icon: 'dashboard',
        link: route('dashboard'),
        active: route().current('dashboard'),
        visible: true,
      },
      {
        label: 'Proyectos',
        icon: 'folder_open',
        link: route('projects.index'),
        active: route().current('projects.*'),
        visible: can('view projects'),
      },
      {
        label: 'Tareas Personales',
        icon: 'check_circle', 
        link: route('personal-tasks.index'),
        active: route().current('personal-tasks.*'),
        visible: true, 
      },
      {
        label: 'Mi Trabajo',
        icon: 'assignment',
        active: route().current('my-work.*'),
        opened: route().current('my-work.*'),
        visible: can('view tasks') || can('view activities'),
        links: [
          {
            label: 'Tareas',
            link: route('my-work.tasks.index'),
            active: route().current('my-work.tasks.*'),
            visible: can('view tasks'),
          },
          {
            label: 'Actividades',
            link: route('my-work.activity.index'),
            active: route().current('my-work.activity.*'),
            visible: can('view activities'),
          },
        ],
      },
      {
        label: 'Áreas',
        icon: 'apartment',
        link: route('areas.index'),
        active: route().current('areas.*'),
        visible: can('view areas'),
      },
      {
        label: 'Usuarios',
        icon: 'group',
        link: route('users.index'),
        active: route().current('users.*'),
        visible: can('view users'),
      },
      {
        label: 'Configuración',
        icon: 'settings',
        active: route().current('settings.*'),
        opened: route().current('settings.*'),
        visible: can('view roles') || can('view labels'),
        links: [
          {
            label: 'Roles',
            link: route('settings.roles.index'),
            active: route().current('settings.roles.*'),
            visible: can('view roles'),
          },
          {
            label: 'Etiquetas',
            link: route('settings.labels.index'),
            active: route().current('settings.labels.*'),
            visible: can('view labels'),
          },
        ],
      },
    ]);
  }, []);

  return (
    <nav className={classes.navbar}>
      <div className={classes.header}>
        <Group
          justify='space-between'
          wrap='nowrap'
        >
          <div
            onClick={mobile ? closeDrawer : undefined}
            style={{
              cursor: mobile ? 'pointer' : 'default',
            }}
          >
            <Logo style={{ width: rem(120) }} />
          </div>

          {mobile && (
            <ActionIcon
              variant='subtle'
              color='white'
              radius='xl'
              size='lg'
              onClick={closeDrawer}
            >
              <AppIcon
                name='close'
                size={22}
              />
            </ActionIcon>
          )}
        </Group>
      </div>

      <ScrollArea className={classes.links}>
        <div className={classes.linksInner}>
          {items
            .filter(i => i.visible)
            .map(item => (
              <NavbarLinksGroup
                key={item.label}
                item={item}
                closeDrawer={closeDrawer}
              />
            ))}
        </div>
      </ScrollArea>

      <div className={classes.footer}>
        <UserButton />
      </div>
    </nav>
  );
}
