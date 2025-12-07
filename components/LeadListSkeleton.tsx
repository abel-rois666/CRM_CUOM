import React from 'react';

// Simula una tarjeta del Dashboard
const StatCardSkeleton = () => (
  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm h-32 flex flex-col justify-between animate-pulse">
     <div className="flex justify-between items-start">
         <div className="space-y-2 w-full">
             <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded-full w-1/3"></div>
             <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded-lg w-1/2"></div>
         </div>
         <div className="h-10 w-10 bg-gray-200 dark:bg-slate-700 rounded-xl"></div>
     </div>
  </div>
);

const SkeletonRow = () => (
  <tr className="animate-pulse border-b border-gray-50 last:border-0">
    <td className="px-6 py-4">
      <div className="flex items-center">
         <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-slate-700 mr-3 flex-shrink-0"></div>
         <div className="space-y-2 w-full">
             <div className="h-3.5 bg-gray-200 dark:bg-slate-700 rounded-full w-32"></div>
             <div className="h-2.5 bg-gray-200 dark:bg-slate-700 rounded-full w-24"></div>
         </div>
      </div>
    </td>
    <td className="px-6 py-4 hidden md:table-cell">
      <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded-full w-24"></div>
    </td>
    <td className="px-6 py-4">
      <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded-lg w-20"></div>
    </td>
    <td className="px-6 py-4 hidden sm:table-cell">
        <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded-full w-full max-w-[100px]"></div>
    </td>
    <td className="px-6 py-4 hidden lg:table-cell">
        <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded-full w-20"></div>
    </td>
    <td className="px-6 py-4 text-center hidden sm:table-cell">
        <div className="h-8 w-8 bg-gray-200 dark:bg-slate-700 rounded-lg mx-auto"></div>
    </td>
    <td className="px-6 py-4 text-right">
      <div className="flex justify-end space-x-2">
        <div className="h-8 w-8 bg-gray-200 dark:bg-slate-700 rounded-lg"></div>
        <div className="h-8 w-8 bg-gray-200 dark:bg-slate-700 rounded-lg"></div>
      </div>
    </td>
  </tr>
);

const KanbanColumnSkeleton = () => (
    <div className="flex-shrink-0 w-[85vw] sm:w-80 flex flex-col bg-gray-100/50 rounded-2xl border border-gray-200 h-full animate-pulse snap-center">
        <div className="p-4 border-b border-gray-200/50 flex justify-between items-center bg-white/50 rounded-t-2xl">
             <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-gray-300"></div>
                <div className="h-4 bg-gray-300 rounded w-24"></div>
             </div>
             <div className="h-5 w-8 bg-gray-300 rounded-lg"></div>
        </div>
        <div className="p-3 space-y-3 flex-1 overflow-hidden">
            <div className="h-32 bg-white rounded-xl shadow-sm border border-gray-200"></div>
            <div className="h-32 bg-white rounded-xl shadow-sm border border-gray-200"></div>
            <div className="h-32 bg-white rounded-xl shadow-sm border border-gray-200"></div>
        </div>
    </div>
);

interface LeadListSkeletonProps {
    viewMode?: 'list' | 'kanban';
}

const LeadListSkeleton: React.FC<LeadListSkeletonProps> = ({ viewMode = 'list' }) => {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-8xl min-h-screen bg-gray-100/50">
      
      {/* 1. Dashboard Skeleton (Nuevo) */}
      <div className="mb-8 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
         <div className="px-6 py-4 border-b border-gray-100 flex gap-2 bg-gray-50/50">
            <div className="h-9 w-28 bg-white border border-gray-200 rounded-lg"></div>
            <div className="h-9 w-28 bg-gray-200 rounded-lg"></div>
         </div>
         <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
         </div>
      </div>

      {/* 2. Header & Filters Skeleton */}
      <div className="mb-8 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-pulse">
            <div className="space-y-2">
              <div className="h-8 bg-gray-300 rounded-lg w-48"></div>
              <div className="h-4 bg-gray-200 rounded w-64"></div>
            </div>
            <div className="flex gap-3">
                <div className="h-10 bg-gray-200 rounded-xl w-24"></div>
                <div className="h-10 bg-gray-200 rounded-xl w-24"></div>
                <div className="h-10 bg-gray-300 rounded-xl w-32"></div>
            </div>
          </div>
          
          <div className="h-14 bg-white rounded-xl border border-gray-200 animate-pulse"></div>
      </div>
      
      {/* 3. Content Skeleton */}
      {viewMode === 'list' ? (
        <div className="bg-white shadow-sm rounded-2xl overflow-hidden border border-gray-200">
            <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50/50">
                <tr>
                    {[1,2,3,4,5,6,7].map(i => (
                        <th key={i} className="px-6 py-4"><div className="h-3 bg-gray-300 rounded w-20"></div></th>
                    ))}
                </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-50">
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                </tbody>
            </table>
            </div>
        </div>
      ) : (
         <div className="flex overflow-x-auto pb-6 h-[calc(100dvh-240px)] space-x-4 p-2 snap-x snap-mandatory">
            <KanbanColumnSkeleton />
            <KanbanColumnSkeleton />
            <KanbanColumnSkeleton />
         </div>
      )}
    </div>
  );
};

export default LeadListSkeleton;