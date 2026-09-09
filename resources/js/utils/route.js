import axios from 'axios';
import { router } from '@inertiajs/react';
import omit from 'lodash/omit';
import pick from 'lodash/pick';
import queryString from 'query-string';

export const redirectTo = (routeName, params = {}) => {
  router.get(route(routeName, params));
};

export const redirectToUrl = (url) => {
  router.get(url);
};

/**
 * Consulta si la tarea a la que apunta el link de una notificación de tipo
 * "tasks.open" sigue activa, está archivada o ya no existe.
 *
 * El link de estas notificaciones siempre termina en `/open`; se pide el
 * mismo recurso reemplazando ese sufijo por `/status`, que responde JSON
 * sin disparar ninguna navegación.
 *
 * @returns {Promise<'active'|'archived'|'missing'>} 'active' también ante
 *          cualquier error de red, para no bloquear links que no son de tareas.
 */
export const checkTaskLinkStatus = async (link) => {
  if (!link || !link.includes('/open')) {
    return 'active';
  }

  try {
    const statusUrl = link.replace(/\/open(?=$|\?)/, '/status');
    const { data } = await axios.get(statusUrl);
    return data?.status ?? 'active';
  } catch (e) {
    console.warn('No se pudo verificar el estado de la actividad', e);
    return 'active';
  }
};

export const currentUrl = () => {
  return location.origin + location.pathname;
}

export const currentUrlParams = () => {
  return queryString.parse(location.search, {
    arrayFormat: 'index',
    parseBooleans: true,
    parseNumbers: true,
  });
}

export const reloadWithQuery = (query, keepPrevious = false) => {
  router.get(
    currentUrl(),
    keepPrevious ? {...currentUrlParams(), ...query} : {...query},
    {
      preserveState: true,
      preserveScroll: true,
      replace: true,
    }
  );
};

export const reloadWithoutQueryParams = ({exclude, keep}) => {
  let params = currentUrlParams();

  if(exclude) {
    params = omit(currentUrlParams(), exclude);
  } else if(keep) {
    params = pick(currentUrlParams(), keep);
  }

  router.get(
    currentUrl(),
    params,
    {
      preserveState: true,
      preserveScroll: true,
      replace: true,
    }
  );
};

export const replaceUrlWithoutReload = (url) => {
  window.history.replaceState(
    {},
    "",
    url + location.search,
  );
};

export const openInNewTab = (routeName, params = {}) => {
  window.open(route(routeName, params));
};