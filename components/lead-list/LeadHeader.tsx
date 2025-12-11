import React from 'react';
import Button from '../common/Button';
import TransferIcon from '../icons/TransferIcon';
import ArrowUpTrayIcon from '../icons/ArrowUpTrayIcon';
import ChartBarIcon from '../icons/ChartBarIcon';
import ArrowDownTrayIcon from '../icons/ArrowDownTrayIcon';
import PlusIcon from '../icons/PlusIcon';

interface LeadHeaderProps {
    totalLeads: number;
    loadedLeadsCount: number;
    userRole?: 'admin' | 'advisor' | 'moderator';
    onOpenImport: () => void;
    onOpenReports: () => void;
    onExportCSV: () => void;
    onAddNew: () => void;
    onOpenBulkTransfer: () => void;
}

const LeadHeader: React.FC<LeadHeaderProps> = ({
    totalLeads,
    loadedLeadsCount,
    userRole,
    onOpenImport,
    onOpenReports,
    onExportCSV,
    onAddNew,
    onOpenBulkTransfer
}) => {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Clientes Potenciales</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    Total en Base: <span className="font-bold text-brand-primary dark:text-blue-400">{totalLeads}</span>
                    {userRole === 'admin' && (
                        <> | Cargados: <span className="font-bold text-gray-700 dark:text-gray-300">{loadedLeadsCount}</span></>
                    )}
                </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {userRole === 'admin' && (
                    <Button onClick={onOpenBulkTransfer} variant="secondary" size="sm" className="px-3 sm:px-4 border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 hover:border-amber-300 dark:bg-amber-900/20 dark:hover:text-white dark:text-white dark:border-amber-800 dark:hover:bg-amber-900/40 dark:hover:border-shadow-lg dark:hover:shadow-brand-secondary/20 dark:hover:hidden dark:hover:md:flex" title="Reasignar Leads">
                        <TransferIcon className="w-5 h-5 sm:mr-2" /> <span className="hidden sm:inline">Reasignar</span>
                    </Button>
                )}
                <Button onClick={onOpenImport} variant="secondary" size="sm" className="px-3 sm:px-4">
                    <ArrowUpTrayIcon className="w-5 h-5 sm:mr-2" /> <span className="hidden sm:inline">Importar</span>
                </Button>
                <Button onClick={onOpenReports} variant="secondary" size="sm" className="px-3 sm:px-4">
                    <ChartBarIcon className="w-5 h-5 sm:mr-2" /> <span className="hidden sm:inline">Reporte</span>
                </Button>
                {userRole === 'admin' && (
                    <Button onClick={onExportCSV} variant="secondary" size="sm" className="px-3 sm:px-4">
                        <ArrowDownTrayIcon className="w-5 h-5 sm:mr-2" /> <span className="hidden sm:inline">Exportar (Pagina)</span>
                    </Button>
                )}
                <Button
                    onClick={onAddNew}
                    className="shadow-lg shadow-brand-secondary/20 !rounded-full w-12 h-12 !p-0 flex items-center justify-center md:!rounded-xl md:w-auto md:!px-4 md:!py-2"
                >
                    <PlusIcon className="w-8 h-8 stroke-2 md:w-5 md:h-5 md:mr-2 md:stroke-[1.5]" />
                    <span className="hidden md:inline">Nuevo Lead</span>
                </Button>
            </div>
        </div>
    );
};

export default LeadHeader;
