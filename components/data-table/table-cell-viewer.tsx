'use client';

import * as React from 'react';
import { z } from 'zod';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { DataTableChart } from './data-table-chart';

const schema = z.object({
  id: z.number(),
  header: z.string(),
  type: z.string(),
  status: z.string(),
  target: z.string(),
  limit: z.string(),
  reviewer: z.string(),
});

interface TableCellViewerProps {
  item: z.infer<typeof schema>;
}

export const TableCellViewer = React.memo(function TableCellViewer({
  item,
}: TableCellViewerProps) {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="ghost" className="justify-start text-left font-medium">
          {item.header}
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
            <Button variant="outline">Done</Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
});

TableCellViewer.displayName = 'TableCellViewer';
