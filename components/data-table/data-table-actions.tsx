'use client';

import * as React from 'react';
import { Row } from '@tanstack/react-table';
import {
  IconDotsVertical,
  IconLayoutColumns,
  IconLoader,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { DataTableCellViewer } from './data-table-cell-viewer';

interface DataTableActionsProps {
  table: any;
}

export const DataTableActions = React.memo(function DataTableActions({
  table,
}: DataTableActionsProps) {
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = React.useCallback(async () => {
    setIsRefreshing(true);
    // Simulate refresh - in real app this would refetch data
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  }, []);

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder="Filter prompts..."
          value={(table.getColumn('header')?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn('header')?.setFilterValue(event.target.value)
          }
          className="h-8 w-[150px] lg:w-[250px]"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="h-8"
        >
          {isRefreshing ? (
            <>
              <IconLoader className="mr-2 h-4 w-4 animate-spin" />
              Refreshing...
            </>
          ) : (
            'Refresh'
          )}
        </Button>
      </div>
      <div className="flex items-center space-x-2">
        <DataTableCellViewer table={table} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <IconLayoutColumns className="mr-2 h-4 w-4" />
              View
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[150px]">
            <DropdownMenuCheckboxItem
              checked={table.getIsAllPageRowsSelected()}
              onCheckedChange={(value) =>
                table.toggleAllPageRowsSelected(!!value)
              }
            >
              Select all
            </DropdownMenuCheckboxItem>
            {table
              .getAllColumns()
              .filter(
                (column: any) =>
                  typeof column.accessorFn !== 'undefined' &&
                  column.getCanHide(),
              )
              .map((column: any) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

DataTableActions.displayName = 'DataTableActions';
