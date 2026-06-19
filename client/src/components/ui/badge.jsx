import { cn } from '@/lib/utils';
const variants = {
  default: 'text-white',
  secondary: 'text-foreground',
  destructive: 'bg-red-100 text-red-700',
  outline: 'border border-input text-foreground',
  success: 'bg-green-100 text-green-700',
  warning: 'text-white',
};
const styles = {
  default: { backgroundColor: '#D3542A' },
  secondary: { backgroundColor: '#F5E3D7', color: '#8B4C39' },
  destructive: {},
  outline: {},
  success: {},
  warning: { backgroundColor: '#C89B6E' },
};
export function Badge({ className, variant = 'default', style, ...props }) {
  return (
    <span
      className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', variants[variant], className)}
      style={{ ...styles[variant], ...style }}
      {...props}
    />
  );
}
