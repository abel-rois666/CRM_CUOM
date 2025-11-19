
import React from 'react';

const SkeletonRow = () => (
  <tr className="animate-pulse">
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-3 bg-gray-200 rounded w-1/2 mt-2"></div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="h-5 bg-gray-200 rounded-full w-20"></div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-gray-200 rounded w-24"></div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-center">
        <div className="h-5 w-5 bg-gray-200 rounded-full mx-auto"></div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-right">
      <div className="flex justify-end space-x-2">
        <div className="h-6 w-6 bg-gray-200 rounded"></div>
        <div className="h-6 w-6 bg-gray-200 rounded"></div>
      </div>
    </td>
  </tr>
);

const KanbanColumnSkeleton = () => (
    <div className="flex-shrink-0 w-80 flex flex-col bg-gray-100 rounded-lg border border-gray-200 h-full animate-pulse">
        <div className="p-3 border-b border-gray-200 bg-white rounded-t-lg h-12"></div>
        <div className="p-2 space-y-2 flex-1">
            <div className="h-24 bg-gray-200 rounded-md bg-white border border-gray-200"></div>
            <div className="h-24 bg-gray-200 rounded-md bg-white border border-gray-200"></div>
            <div className="h-24 bg-gray-200 rounded-md bg-white border border-gray-200"></div>
        </div>
    </div>
);

interface LeadListSkeletonProps {
    viewMode?: 'list' | 'kanban';
}

const LeadListSkeleton: React.FC<LeadListSkeletonProps> = ({ viewMode = 'list' }) => {
  if (viewMode === 'kanban') {
      return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header Skeleton */}
             <div className="sm:flex sm:items-center sm:justify-between mb-6 animate-pulse">
                <div>
                  <div className="h-8 bg-gray-300 rounded w-64 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-96"></div>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-4 flex items-center space-x-2">
                    <div className="h-10 bg-gray-300 rounded-md w-40"></div>
                    <div className="h-10 bg-gray-300 rounded-md w-48"></div>
                </div>
            </div>
             {/* Kanban Board Skeleton */}
            <div className="flex overflow-x-auto pb-4 h-[calc(100vh-220px)] space-x-4">
                <KanbanColumnSkeleton />
                <KanbanColumnSkeleton />
                <KanbanColumnSkeleton />
                <KanbanColumnSkeleton />
            </div>
        </div>
      );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Skeleton */}
      <div className="sm:flex sm:items-center sm:justify-between mb-6 animate-pulse">
        <div>
          <div className="h-8 bg-gray-300 rounded w-64 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-96"></div>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-4 flex items-center space-x-2">
            <div className="h-10 bg-gray-300 rounded-md w-40"></div>
            <div className="h-10 bg-gray-300 rounded-md w-48"></div>
        </div>
      </div>

      {/* Filters Skeleton */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="h-10 bg-gray-200 rounded-md"></div>
          <div className="h-10 bg-gray-200 rounded-md"></div>
          <div className="h-10 bg-gray-200 rounded-md"></div>
          <div className="h-10 bg-gray-200 rounded-md"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200">
          <div className="md:col-span-1">
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
            <div className="h-10 bg-gray-200 rounded-md"></div>
          </div>
          <div className="md:col-span-1">
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
            <div className="h-10 bg-gray-200 rounded-md"></div>
          </div>
        </div>
      </div>
      
      {/* Table Skeleton */}
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asesor</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Licenciatura</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Registro</th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Cita</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LeadListSkeleton;
