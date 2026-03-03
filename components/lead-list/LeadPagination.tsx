import React, { useState } from 'react';
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
    const totalPages = Math.max(1, Math.ceil(totalLeads / pageSize));

    // ── Estado local del input "Ir a página" ────────────────────────────────
    const [inputPage, setInputPage] = useState('');

    const handleGoToPage = () => {
        const target = parseInt(inputPage, 10);
        if (!isNaN(target) && target >= 1 && target <= totalPages) {
            onPageChange(target);
        }
        setInputPage('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleGoToPage();
        // Solo permitir dígitos y teclas de control
        if (!/[\d]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
        }
    };

    return (
        <div className="bg-gray-50 dark:bg-slate-800 px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4">
            {/* ── Contador de resultados ── */}
            <div className="text-sm text-gray-500 dark:text-gray-400 order-2 sm:order-1 text-center sm:text-left">
                Mostrando{' '}
                <span className="font-medium text-gray-900 dark:text-white">
                    {totalLeads === 0 ? 0 : Math.min((page - 1) * pageSize + 1, totalLeads)}
                </span>{' '}
                a{' '}
                <span className="font-medium text-gray-900 dark:text-white">
                    {Math.min(page * pageSize, totalLeads)}
                </span>{' '}
                de{' '}
                <span className="font-medium text-gray-900 dark:text-white">{totalLeads}</span>{' '}
                resultados
            </div>

            <div className="flex items-center gap-3 sm:gap-4 order-1 sm:order-2 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
                {/* ── Registros por página ── */}
                <select
                    id="page-size-select"
                    name="page-size-select"
                    value={pageSize}
                    onChange={e => onPageSizeChange(Number(e.target.value))}
                    className="border border-gray-300 dark:border-slate-600 rounded-md text-sm px-2 py-1.5 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 focus:ring-brand-secondary focus:border-brand-secondary"
                    aria-label="Resultados por página"
                >
                    <option value={10}>10 por pág</option>
                    <option value={20}>20 por pág</option>
                    <option value={50}>50 por pág</option>
                    <option value={100}>100 por pág</option>
                </select>

                {/* ── Ir a página ── */}
                <div className="flex items-center gap-1.5">
                    <label htmlFor="go-to-page-input" className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap hidden sm:block">
                        Ir a:
                    </label>
                    <input
                        id="go-to-page-input"
                        name="go-to-page-input"
                        type="text"
                        inputMode="numeric"
                        value={inputPage}
                        onChange={e => setInputPage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={handleGoToPage}
                        placeholder="Pág."
                        aria-label={`Ir a página (1–${totalPages})`}
                        className="w-16 border border-gray-300 dark:border-slate-600 rounded-md text-sm px-2 py-1.5 text-center bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-brand-secondary focus:border-brand-secondary outline-none"
                    />
                    <button
                        onClick={handleGoToPage}
                        disabled={totalPages <= 1}
                        aria-label="Ir a la página indicada"
                        className="px-2.5 py-1.5 rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        →
                    </button>
                </div>

                {/* ── Anterior / Página X de Y / Siguiente ── */}
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
                    <div className="relative inline-flex items-center px-3 sm:px-4 py-2 border-t border-b border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap select-none">
                        {page} / {totalPages}
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
