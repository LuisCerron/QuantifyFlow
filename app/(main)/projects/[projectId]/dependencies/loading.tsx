import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="container mx-auto p-6">
      <Skeleton className="h-8 w-64 mb-4" />
      <Skeleton className="h-[80vh] w-full" />
    </div>
  );
}
