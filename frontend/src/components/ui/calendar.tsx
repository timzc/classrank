import { DayPicker, type DayPickerProps } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { cn } from '@/lib/utils';

export function Calendar({ className, classNames, ...props }: DayPickerProps) {
  return (
    <DayPicker
      showOutsideDays
      className={cn('p-2', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row gap-4',
        caption_label: 'text-sm font-medium',
        nav_button: 'h-7 w-7 bg-transparent hover:bg-black/5 rounded-md',
        head_cell: 'text-muted-foreground w-9 text-xs font-normal',
        cell: 'h-9 w-9 text-center text-sm relative [&:has([aria-selected])]:bg-black/5',
        day: 'h-9 w-9 rounded-md hover:bg-black/5 aria-selected:bg-primary aria-selected:text-primary-foreground',
        day_today: 'font-semibold',
        ...classNames,
      }}
      {...props}
    />
  );
}
