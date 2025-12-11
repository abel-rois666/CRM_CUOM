import ChevronLeftIcon from '../icons/ChevronLeftIcon';
import ChevronRightIcon from '../icons/ChevronRightIcon';

interface LeadPaginationProps {
    totalLeads: number;
    page: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
}

const LeadPagination: React.FC<LeadPaginationProps> = ({
    totalLeads,
    page,
    pageSize,
    onPageChange,
    onPageSizeChange
}) => {
    const totalPages = Math.ceil(totalLeads / pageSize);

    return (
        <div className="bg-gray-50 dark:bg-slate-800 px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-500 dark:text-gray-400 order-2 sm:order-1 text-center sm:text-left">
                Mostrando <span className="font-medium text-gray-900 dark:text-white">{Math.min((page - 1) * pageSize + 1, totalLeads)}</span> a <span className="font-medium text-gray-900 dark:text-white">{Math.min(page * pageSize, totalLeads)}</span> de <span className="font-medium text-gray-900 dark:text-white">{totalLeads}</span> resultados
            </div>

            <div className="flex items-center gap-3 sm:gap-4 order-1 sm:order-2 w-full sm:w-auto justify-between sm:justify-end">
                <select
                    value={pageSize}
                    onChange={e => onPageSizeChange(Number(e.target.value))}
                    className="border border-gray-300 dark:border-slate-600 rounded-md text-sm px-2 py-1.5 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 focus:ring-brand-secondary focus:border-brand-secondary"
                >
                    <option value={10}>10 por pág</option>
                    <option value={20}>20 por pág</option>
                    <option value={50}>50 por pág</option>
                    <option value={100}>100 por pág</option>
                </select>

                <div className="flex rounded-md shadow-sm">
                    <button
                        onClick={() => onPageChange(page - 1)}
                        disabled={page === 1}
                        className="relative inline-flex items-center px-2 sm:px-3 py-2 rounded-l-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="sr-only">Anterior</span>
                        <ChevronLeftIcon className="h-5 w-5 sm:hidden" aria-hidden="true" />
                        <span className="hidden sm:inline">Anterior</span>
                    </button>
                    <div className="relative inline-flex items-center px-3 sm:px-4 py-2 border-t border-b border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">
                        {page} / {totalPages || 1}
                    </div>
                    <button
                        onClick={() => onPageChange(page + 1)}
                        disabled={page >= totalPages}
                        className="relative inline-flex items-center px-2 sm:px-3 py-2 rounded-r-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="sr-only">Siguiente</span>
                        <ChevronRightIcon className="h-5 w-5 sm:hidden" aria-hidden="true" />
                        <span className="hidden sm:inline">Siguiente</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LeadPagination;
