import React from 'react';
import { cn } from '../../lib/utils';

const Skeleton = ({
  className,
  ...props
}) => (
  <div
    className={cn("animate-pulse rounded-md bg-muted", className)}
    {...props}
  />
);

export { Skeleton };

// Skeleton variants for different UI elements
export const CardSkeleton = ({ className, ...props }) => (
  <div className={cn("rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden", className)} {...props}>
    <div className="p-6 space-y-4">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-9 rounded-md" />
      </div>
    </div>
  </div>
);

export const TableRowSkeleton = ({ columns = 4, className, ...props }) => (
  <tr className={cn("animate-pulse", className)} {...props}>
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="px-6 py-4">
        <Skeleton className="h-4 w-full" />
      </td>
    ))}
  </tr>
);

export const ListItemSkeleton = ({ className, ...props }) => (
  <div className={cn("flex items-center justify-between py-4 border-b", className)} {...props}>
    <div className="space-y-2 w-full">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
    <Skeleton className="h-9 w-24 rounded-md" />
  </div>
);

export const FormSkeleton = ({ fields = 3, className, ...props }) => (
  <div className={cn("space-y-6", className)} {...props}>
    {Array.from({ length: fields }).map((_, i) => (
      <div key={i} className="space-y-2">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-10 w-full" />
      </div>
    ))}
    <div className="flex justify-end gap-2 pt-4">
      <Skeleton className="h-10 w-24" />
      <Skeleton className="h-10 w-24" />
    </div>
  </div>
);
