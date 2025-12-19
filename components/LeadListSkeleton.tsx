// components/LeadListSkeleton.tsx
import React from 'react';

// New Metric Card Skeleton matching DashboardStats
const MetricCardSkeleton = () => (
  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col justify-between animate-pulse h-40 relative overflow-hidden">
    <div className="flex justify-between items-start z-10">
      <div className="space-y-4 w-full">
        {/* Header: Title + Icon */}
        <div className="flex justify-between items-center mb-2">
          <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2"></div>
          <div className="h-8 w-8 bg-gray-100 dark:bg-slate-700 rounded-lg"></div>
        </div>

        {/* Number */}
        <div className="h-10 bg-gray-200 dark:bg-slate-700 rounded-lg w-16"></div>
        {/* Subtitle */}
        <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-2/3 mt-2"></div>
      </div>
    </div>
  </div>
);

const SkeletonRow = () => (
  <tr className="animate-pulse border-b border-gray-50 dark:border-slate-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-slate-800/50">
    <td className="px-4 py-4 w-12">
      <div className="h-4 w-4 rounded-md bg-gray-200 dark:bg-slate-700"></div>
    </td>
    <td className="px-2 py-4 w-8">
      <div className="h-4 w-4 rounded-full bg-gray-200 dark:bg-slate-700"></div>
    </td>
    <td className="px-4 py-4 w-20">
      <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded-full w-12"></div>
    </td>
    <td className="px-6 py-4">
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-32"></div>
        <div className="h-3 bg-gray-100 dark:bg-slate-800 rounded w-24"></div>
      </div>
    </td>
    <td className="px-6 py-4 hidden md:table-cell">
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-slate-700"></div>
        <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-20"></div>
      </div>
    </td>
    <td className="px-6 py-4 hidden lg:table-cell">
      <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded-full w-24"></div>
    </td>
    <td className="px-6 py-4 hidden xl:table-cell">
      <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-24"></div>
    </td>
    <td className="px-6 py-4 text-right">
      <div className="flex justify-end space-x-2">
        <div className="h-8 w-8 bg-gray-200 dark:bg-slate-700 rounded-lg"></div>
      </div>
    </td>
  </tr>
);

export const LeadTableSkeleton = () => (
  <div className="bg-white dark:bg-slate-800 shadow-sm rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-700 animate-fade-in">
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
        <thead className="bg-gray-50/50 dark:bg-slate-700/50">
          <tr>
            <th className="px-4 py-4 w-12"><div className="h-4 w-4 bg-gray-300 dark:bg-slate-600 rounded"></div></th>
            <th className="px-2 py-4 w-8"></th>
            <th className="px-4 py-4"><div className="h-3 bg-gray-300 dark:bg-slate-600 rounded w-12"></div></th>
            <th className="px-6 py-4"><div className="h-3 bg-gray-300 dark:bg-slate-600 rounded w-24"></div></th>
            <th className="px-6 py-4 hidden md:table-cell"><div className="h-3 bg-gray-300 dark:bg-slate-600 rounded w-20"></div></th>
            <th className="px-6 py-4 hidden lg:table-cell"><div className="h-3 bg-gray-300 dark:bg-slate-600 rounded w-16"></div></th>
            <th className="px-6 py-4 hidden xl:table-cell"><div className="h-3 bg-gray-300 dark:bg-slate-600 rounded w-20"></div></th>
            <th className="px-6 py-4"></th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-50 dark:divide-slate-700/50">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
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
);

const KanbanColumnSkeleton = () => (
  <div className="flex-shrink-0 w-[85vw] sm:w-80 flex flex-col bg-gray-100/50 dark:bg-slate-900/50 rounded-2xl border border-gray-200 dark:border-slate-700 h-full animate-pulse snap-center">
    <div className="p-4 border-b border-gray-200/50 dark:border-slate-700/50 flex justify-between items-center bg-white/50 dark:bg-slate-800/50 rounded-t-2xl">
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full bg-gray-300 dark:bg-slate-600"></div>
        <div className="h-4 bg-gray-300 dark:bg-slate-600 rounded w-24"></div>
      </div>
      <div className="h-5 w-8 bg-gray-300 dark:bg-slate-600 rounded-lg"></div>
    </div>
    <div className="p-3 space-y-3 flex-1 overflow-hidden">
      <div className="h-32 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700"></div>
      <div className="h-32 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700"></div>
      <div className="h-32 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700"></div>
    </div>
  </div>
);

export const LeadKanbanSkeleton = () => (
  <div className="flex overflow-x-auto pb-6 h-[calc(100dvh-240px)] space-x-4 p-2 snap-x snap-mandatory animate-fade-in">
    <KanbanColumnSkeleton />
    <KanbanColumnSkeleton />
    <KanbanColumnSkeleton />
  </div>
);

interface LeadListSkeletonProps {
  viewMode?: 'list' | 'kanban' | 'calendar';
}

const LeadListSkeleton: React.FC<LeadListSkeletonProps> = ({ viewMode = 'list' }) => {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-8xl min-h-screen bg-gray-100/50 dark:bg-slate-900 transition-colors">

      {/* 1. Dashboard Skeleton (Matches DashboardStats) */}
      <div className="mb-8 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        {/* Tabs Area */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center bg-white dark:bg-slate-800">
          <div className="grid grid-cols-3 gap-2 w-full sm:w-auto bg-gray-100/50 dark:bg-slate-700/50 p-1 rounded-xl animate-pulse">
            {/* Active Tab */}
            <div className="h-8 w-32 bg-white dark:bg-slate-600 rounded-lg shadow-sm"></div>
            {/* Inactive Tabs */}
            <div className="h-8 w-32 rounded-lg"></div>
            <div className="h-8 w-32 rounded-lg"></div>
          </div>
        </div>
        {/* Cards Area */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50/30 dark:bg-slate-900/30">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>
      </div>

      {/* 2. LeadHeader & Toolbar Skeleton */}
      <div className="mb-6 flex flex-col gap-6 animate-pulse">
        {/* Header: Title + Action Buttons */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="space-y-2 w-full md:w-auto">
            {/* "Clientes Potenciales" */}
            <div className="h-8 bg-gray-300 dark:bg-slate-600 rounded-lg w-48"></div>
            {/* Subtitle count */}
            <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-32"></div>
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
            {/* Secondary Buttons (Outline) */}
            <div className="h-10 w-24 bg-white border border-gray-200 dark:border-slate-600 rounded-xl"></div>
            <div className="h-10 w-24 bg-white border border-gray-200 dark:border-slate-600 rounded-xl"></div>
            <div className="h-10 w-24 bg-white border border-gray-200 dark:border-slate-600 rounded-xl"></div>
            <div className="h-10 w-28 bg-white border border-gray-200 dark:border-slate-600 rounded-xl"></div>
            {/* Primary Button (Solid Blue) */}
            <div className="h-10 w-32 bg-blue-600/30 dark:bg-blue-600/50 rounded-xl"></div>
          </div>
        </div>

        {/* Toolbar: Search + View Toggles */}
        <div className="flex flex-col gap-4">
          {/* Search Row */}
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            {/* Search Input */}
            <div className="h-12 flex-1 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700"></div>

            {/* Right Side: Filter + View Toggles */}
            <div className="flex gap-2">
              <div className="h-12 w-24 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700"></div>
              <div className="h-12 w-32 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700"></div>
            </div>
          </div>
        </div>

        {/* Status Tabs Row (Segmented Control) */}
        <div className=" bg-gray-200/50 dark:bg-slate-700/30 p-1 rounded-xl w-full h-12 flex items-center">
          <div className="h-10 w-1/3 bg-white dark:bg-slate-600 rounded-lg shadow-sm mx-1"></div>
          <div className="h-10 w-1/3 mx-1"></div>
          <div className="h-10 w-1/3 mx-1"></div>
        </div>
      </div>

      {/* 3. Content Skeleton */}
      {viewMode === 'list' ? (
        <LeadTableSkeleton />
      ) : (
        <LeadKanbanSkeleton />
      )}
    </div>
  );
};

export default LeadListSkeleton;