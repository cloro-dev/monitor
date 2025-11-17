import { memo } from 'react';
import { icons } from 'lucide-react';

import { cn } from '@/lib/utils';

export type IconName = keyof typeof icons;

export type IconProps = {
  name: IconName;
  className?: string;
  strokeWidth?: number;
  onClick?: () => void;
};

export const Icon = memo(
  ({ name, className, strokeWidth, onClick }: IconProps) => {
    const IconComponent = icons[name];

    if (!IconComponent) {
      return null;
    }

    return (
      <IconComponent
        className={cn('h-4 w-4', className)}
        strokeWidth={strokeWidth || 2.5}
        onClick={onClick}
      />
    );
  },
);

Icon.displayName = 'Icon';
