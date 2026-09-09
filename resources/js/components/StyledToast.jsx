import { Alert, Box, Transition, rem } from '@mantine/core';
import {
  IconAlertCircle,
  IconCircleCheck,
  IconCircleX,
  IconInfoCircle,
} from '@tabler/icons-react';
import classes from './css/FlashNotification.module.css';

const iconProps = { style: { width: rem(40), height: rem(40) }, stroke: 2 };

export const TOAST_TYPES = {
  info: {
    color: 'blue',
    timeout: 8000,
    icon: <IconInfoCircle {...iconProps} />,
  },
  success: {
    color: 'green',
    timeout: 4000,
    icon: <IconCircleCheck {...iconProps} />,
  },
  warning: {
    color: 'yellow',
    timeout: 10000,
    icon: <IconAlertCircle {...iconProps} />,
  },
  error: {
    color: 'red',
    timeout: 10000,
    icon: <IconCircleX {...iconProps} />,
  },
};

const customSlideDown = {
  in: { opacity: 1, transform: 'translate(-50%, 0)' },
  out: { opacity: 0, transform: 'translate(-50%, -100%)' },
  common: { transformOrigin: 'top' },
  transitionProperty: 'transform, opacity',
};


export default function StyledToast({ opened, type, title, message, onClose }) {
  if (!type || !TOAST_TYPES[type]) return null;

  return (
    <Transition
      mounted={opened}
      transition={customSlideDown}
      duration={300}
      exitDuration={600}
      timingFunction="easeOut"
    >
      {(styles) => (
        <Box
          mb="lg"
          style={styles}
          className={classes.container}
        >
          <Alert
            variant="filled"
            color={TOAST_TYPES[type].color}
            title={title}
            icon={TOAST_TYPES[type].icon}
            classNames={{
              root: classes.alert,
              icon: classes.icon,
              title: classes.title,
              label: classes.label,
              message: classes.message,
            }}
            radius="md"
            withCloseButton
            onClose={onClose}
          >
            {message}
          </Alert>
        </Box>
      )}
    </Transition>
  );
}