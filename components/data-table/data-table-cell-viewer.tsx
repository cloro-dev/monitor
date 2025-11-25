'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { DataTableChart } from './data-table-chart';
import { z } from 'zod';

const schema = z.object({
  id: z.number(),
  header: z.string(),
  type: z.string(),
  status: z.string(),
  target: z.string(),
  limit: z.string(),
  reviewer: z.string(),
});

interface DataTableCellViewerProps {
  table: any;
}

export const DataTableCellViewer = React.memo(function DataTableCellViewer({
  table,
}: DataTableCellViewerProps) {
  const selectedRow = React.useMemo(() => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    return selectedRows.length === 1 ? selectedRows[0] : null;
  }, [table]);

  if (!selectedRow) {
    return null;
  }

  const item = selectedRow.original as z.infer<typeof schema>;

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          View Details
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>{item.header}</DrawerTitle>
            <DrawerDescription>
              View detailed information about this prompt.
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 pb-0">
            <DataTableChart data={[item]} />
          </div>
          <DrawerFooter className="pt-2">
            <DrawerClose asChild>
              <Button variant="outline">Done</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
});

DataTableCellViewer.displayName = 'DataTableCellViewer';
