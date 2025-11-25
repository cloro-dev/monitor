'use client';

import * as React from 'react';
import { useMemo, useCallback, useReducer } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { z } from 'zod';
import { toast } from 'sonner';

import { useIsMobile } from '@/hooks/use-mobile';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DataTableCore } from './data-table/data-table-core';
import { columns, schema, DraggableRow } from './data-table/data-table-columns';

// State reducer for better state management
interface DataTableState {
  data: z.infer<typeof schema>[];
  rowSelection: Record<string, boolean>;
  columnVisibility: Record<string, boolean>;
  columnFilters: Array<{ id: string; value: string }>;
  sorting: Array<{ id: string; desc: boolean }>;
  pagination: { pageIndex: number; pageSize: number };
}

type DataTableAction =
  | { type: 'SET_DATA'; payload: z.infer<typeof schema>[] }
  | { type: 'SET_ROW_SELECTION'; payload: Record<string, boolean> }
  | { type: 'SET_COLUMN_VISIBILITY'; payload: Record<string, boolean> }
  | {
      type: 'SET_COLUMN_FILTERS';
      payload: Array<{ id: string; value: string }>;
    }
  | { type: 'SET_SORTING'; payload: Array<{ id: string; desc: boolean }> }
  | { type: 'SET_PAGINATION'; payload: { pageIndex: number; pageSize: number } }
  | { type: 'MOVE_ROW'; payload: { from: number; to: number } };

const initialState: DataTableState = {
  data: [],
  rowSelection: {},
  columnVisibility: {},
  columnFilters: [],
  sorting: [],
  pagination: { pageIndex: 0, pageSize: 10 },
};

function dataTableReducer(
  state: DataTableState,
  action: DataTableAction,
): DataTableState {
  switch (action.type) {
    case 'SET_DATA':
      return { ...state, data: action.payload };
    case 'SET_ROW_SELECTION':
      return { ...state, rowSelection: action.payload };
    case 'SET_COLUMN_VISIBILITY':
      return { ...state, columnVisibility: action.payload };
    case 'SET_COLUMN_FILTERS':
      return { ...state, columnFilters: action.payload };
    case 'SET_SORTING':
      return { ...state, sorting: action.payload };
    case 'SET_PAGINATION':
      return { ...state, pagination: action.payload };
    case 'MOVE_ROW':
      const { from, to } = action.payload;
      const newData = arrayMove(state.data, from, to);
      return { ...state, data: newData };
    default:
      return state;
  }
}

interface DataTableProps {
  data: z.infer<typeof schema>[];
  initialPageSize?: number;
}

export const DataTable = React.memo(function DataTable({
  data: initialData,
  initialPageSize = 10,
}: DataTableProps) {
  const [state, dispatch] = useReducer(dataTableReducer, {
    ...initialState,
    data: initialData,
    pagination: { pageIndex: 0, pageSize: initialPageSize },
  });

  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {}),
  );

  // Memoize data IDs for drag and drop context
  const dataIds = useMemo(() => state.data.map(({ id }) => id), [state.data]);

  // Handle drag end event
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (active && over && active.id !== over.id) {
        const oldIndex = state.data.findIndex((item) => item.id === active.id);
        const newIndex = state.data.findIndex((item) => item.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          dispatch({
            type: 'MOVE_ROW',
            payload: { from: oldIndex, to: newIndex },
          });
          toast.success('Row reordered successfully');
        }
      }
    },
    [state.data],
  );

  // Create table callbacks
  const tableCallbacks = useMemo(
    () => ({
      onRowSelectionChange: (selection: Record<string, boolean>) =>
        dispatch({ type: 'SET_ROW_SELECTION', payload: selection }),
      onSortingChange: (sorting: Array<{ id: string; desc: boolean }>) =>
        dispatch({ type: 'SET_SORTING', payload: sorting }),
      onColumnFiltersChange: (filters: Array<{ id: string; value: string }>) =>
        dispatch({ type: 'SET_COLUMN_FILTERS', payload: filters }),
      onColumnVisibilityChange: (visibility: Record<string, boolean>) =>
        dispatch({ type: 'SET_COLUMN_VISIBILITY', payload: visibility }),
      onPaginationChange: (pagination: {
        pageIndex: number;
        pageSize: number;
      }) => dispatch({ type: 'SET_PAGINATION', payload: pagination }),
    }),
    [],
  );

  // If mobile, use simple table without drag and drop
  if (useIsMobile()) {
    return (
      <DataTableCore
        data={state.data}
        columns={columns.filter((col) => col.id !== 'drag')}
        initialPageSize={initialPageSize}
      />
    );
  }

  // Desktop version with drag and drop
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToVerticalAxis]}
    >
      <SortableContext items={dataIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead key={column.id}>
                      {column.header?.toString() || ''}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.data.length ? (
                  state.data.map((row, index) => (
                    <DraggableRow
                      key={row.id}
                      row={
                        {
                          ...row,
                          id: row.id,
                          getIsSelected: () =>
                            state.rowSelection[row.id] || false,
                          toggleSelected: () => {
                            const newSelection = { ...state.rowSelection };
                            newSelection[row.id] = !newSelection[row.id];
                            tableCallbacks.onRowSelectionChange(newSelection);
                          },
                          getVisibleCells: () =>
                            columns.map((column) => ({
                              id: column.id,
                              column: column,
                              getContext: () => ({
                                row: { original: row, id: row.id, index },
                                getValue: (key: string) =>
                                  row[key as keyof typeof row],
                                renderValue: (key: string) =>
                                  row[key as keyof typeof row],
                              }),
                            })),
                        } as any
                      }
                    />
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </SortableContext>
    </DndContext>
  );
});

DataTable.displayName = 'DataTable';
