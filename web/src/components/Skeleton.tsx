"use client";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
}

export function Skeleton({ className = "", variant = "rectangular" }: SkeletonProps) {
  const baseClasses = "animate-pulse bg-gray-200";

  const variantClasses = {
    text: "h-4 rounded",
    circular: "rounded-full",
    rectangular: "rounded-xl",
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`} />
  );
}

// Card skeleton for events/articles
export function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100">
      <div className="flex items-start justify-between mb-4">
        <Skeleton className="h-6 w-24" variant="text" />
        <Skeleton className="h-6 w-16" variant="text" />
      </div>
      <Skeleton className="h-6 w-3/4 mb-2" variant="text" />
      <Skeleton className="h-4 w-full mb-4" variant="text" />
      <Skeleton className="h-4 w-2/3 mb-4" variant="text" />
      <div className="flex items-center gap-4">
        <Skeleton className="h-4 w-32" variant="text" />
        <Skeleton className="h-4 w-24" variant="text" />
      </div>
    </div>
  );
}

// Table row skeleton
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <tr className="border-b border-gray-100">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="py-4 px-4">
          <Skeleton className="h-4 w-full" variant="text" />
        </td>
      ))}
    </tr>
  );
}

// Profile skeleton
export function ProfileSkeleton() {
  return (
    <div className="flex items-center gap-4">
      <Skeleton className="w-16 h-16" variant="circular" />
      <div className="flex-1">
        <Skeleton className="h-5 w-32 mb-2" variant="text" />
        <Skeleton className="h-4 w-48" variant="text" />
      </div>
    </div>
  );
}

// Stats card skeleton
export function StatsCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="w-12 h-12" variant="rectangular" />
        <Skeleton className="w-8 h-8" variant="rectangular" />
      </div>
      <Skeleton className="h-8 w-16 mb-2" variant="text" />
      <Skeleton className="h-4 w-24" variant="text" />
    </div>
  );
}

// Grid of cards skeleton
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

// Page header skeleton
export function PageHeaderSkeleton() {
  return (
    <div className="py-16 bg-[#0D1B33]">
      <div className="max-w-7xl mx-auto px-6">
        <Skeleton className="h-4 w-24 mb-4" variant="text" />
        <Skeleton className="h-12 w-64 mb-2" variant="text" />
        <Skeleton className="h-6 w-96" variant="text" />
      </div>
    </div>
  );
}
