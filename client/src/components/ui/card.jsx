import { cn } from '@/lib/utils';
export function Card({ className, ...props }) {
  return <div className={cn('rounded-xl border bg-white shadow-sm overflow-hidden', className)} {...props} />;
}
export function CardHeader({ className, ...props }) {
  return <div className={cn('flex flex-col space-y-1 px-6 pt-5 pb-4', className)} {...props} />;
}
export function CardTitle({ className, ...props }) {
  return <h3 className={cn('text-sm font-semibold uppercase tracking-wide', className)} style={{ color: '#8B4C39', ...props.style }} {...props} />;
}
export function CardContent({ className, ...props }) {
  return <div className={cn('px-6 pb-6', className)} {...props} />;
}
