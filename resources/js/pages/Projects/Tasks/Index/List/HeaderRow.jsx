import { Checkbox } from '@mantine/core';
import { useMemo } from 'react';

import ColumnHeader from './Components/ColumnHeader';
import ResizeHandle from './Components/ResizeHandle';
import useTasksStore from '@/hooks/store/useTasksStore';

import classes from './ListView.module.css';

export default function HeaderRow({ widths, setWidth, allTasks = [] }) {
  const { selectedTaskIds, toggleTaskSelection, selectAllTasks, clearTaskSelection } = useTasksStore();

  // Calcular si todos están seleccionados
  const allTaskIds = useMemo(() => {
    return allTasks.map(task => task.id);
  }, [allTasks]);

  const isAllSelected = useMemo(() => {
    return allTaskIds.length > 0 && allTaskIds.every(id => selectedTaskIds.includes(id));
  }, [allTaskIds, selectedTaskIds]);

  const isPartiallySelected = useMemo(() => {
    return selectedTaskIds.length > 0 && !isAllSelected;
  }, [selectedTaskIds, isAllSelected]);

  const handleSelectAll = () => {
    if (isAllSelected) {
      clearTaskSelection();
    } else {
      selectAllTasks(allTasks);
    }
  };

  return (
    <div className={`${classes.row} ${classes.header}`}>
      <div className={classes.dragHandle}></div>

      <div className={classes.checkbox}>
          {can('archive task') && (
              <Checkbox
                  size='xs'
                  checked={isAllSelected}
                  indeterminate={isPartiallySelected}
                  onChange={handleSelectAll}
              />
          )}
      </div>

      <ColumnHeader
        className={classes.key}
        title="N°"
      />

      <ColumnHeader
        className={classes.summary}
        title="Actividad"
      >
        <ResizeHandle
          column="summary"
          width={widths.summary}
          onResize={setWidth}
        />
      </ColumnHeader>

      <ColumnHeader
        className={classes.creator}
        title="Informador"
      />

      <ColumnHeader
        className={classes.assignee}
        title="Responsable"
      />

      <ColumnHeader
        className={classes.priority}
        title="Prioridad"
      />

      <ColumnHeader
        className={classes.status}
        title="Estado"
      />

      <ColumnHeader
        className={classes.due}
        title="Vencimiento"
      />

      <div className={classes.actions}></div>
    </div>
  );
}