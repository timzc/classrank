import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      toastOptions={{
        classNames: {
          toast: 'bg-white border border-border shadow-[0_8px_30px_rgba(0,0,0,0.06)] rounded-xl',
          title: 'text-foreground font-medium',
          description: 'text-muted-foreground',
        },
      }}
    />
  );
}
