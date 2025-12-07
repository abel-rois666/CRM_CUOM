// components/BulkTransferModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import Modal from './common/Modal';
import Button from './common/Button';
import { Select, TextArea } from './common/FormElements'; // Agregamos TextArea
import { Profile } from '../types';
import { supabase } from '../lib/supabase';
import TransferIcon from './icons/TransferIcon';
import UserIcon from './icons/UserIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import ArrowPathIcon from './icons/ArrowPathIcon';
import ExclamationCircleIcon from './icons/ExclamationCircleIcon';
import ListBulletIcon from './icons/ListBulletIcon';
import MagnifyingGlassIcon from './icons/MagnifyingGlassIcon';

interface BulkTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  advisors: Profile[];
}

const BulkTransferModal: React.FC<BulkTransferModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  advisors,
}) => {
  const [sourceAdvisorId, setSourceAdvisorId] = useState('');
  const [targetAdvisorId, setTargetAdvisorId] = useState('');
  const [transferMode, setTransferMode] = useState<'all' | 'quantity' | 'selection'>('all');
  
  const [quantity, setQuantity] = useState<number>(10);
  const [onlyActive, setOnlyActive] = useState(true);
  const [reason, setReason] = useState(''); // Nuevo estado para el motivo
  
  // Estado para la lista manual
  const [leadsList, setLeadsList] = useState<{id: string, name: string, date: string, status: string}[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [listSearchTerm, setListSearchTerm] = useState('');
  const [loadingList, setLoadingList] = useState(false);

  const [loadingCount, setLoadingCount] = useState(false);
  const [totalLeads, setTotalLeads] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ success: number; error?: string } | null>(null);

  // Obtener conteo y lista
  useEffect(() => {
    if (!sourceAdvisorId) {
        setTotalLeads(0);
        setLeadsList([]);
        return;
    }

    const fetchData = async () => {
        setLoadingCount(true);
        if (transferMode === 'selection') setLoadingList(true);

        let query = supabase
            .from('leads')
            .select(`
                id, 
                first_name, 
                paternal_last_name, 
                registration_date,
                status:statuses(name, category)
            `)
            .eq('advisor_id', sourceAdvisorId);

        if (onlyActive) {
            const { data: activeStatuses } = await supabase
                .from('statuses')
                .select('id')
                .eq('category', 'active');
            
            if (activeStatuses && activeStatuses.length > 0) {
                query = query.in('status_id', activeStatuses.map(s => s.id));
            }
        }

        query = query.order('registration_date', { ascending: false });

        const { data, error, count } = await query.select('*', { count: 'exact' });

        if (!error && data) {
            setTotalLeads(count || 0);
            if (quantity > (count || 0)) setQuantity(count || 0);

            const formattedList = data.map((l: any) => ({
                id: l.id,
                name: `${l.first_name} ${l.paternal_last_name}`,
                date: l.registration_date,
                status: l.status?.name || 'Desconocido'
            }));
            setLeadsList(formattedList);
        }
        
        setLoadingCount(false);
        setLoadingList(false);
    };

    fetchData();
  }, [sourceAdvisorId, onlyActive, transferMode]);

  const filteredList = useMemo(() => {
      if (!listSearchTerm) return leadsList;
      return leadsList.filter(l => l.name.toLowerCase().includes(listSearchTerm.toLowerCase()));
  }, [leadsList, listSearchTerm]);

  const toggleSelection = (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
      if (selectedIds.size === filteredList.length) {
          setSelectedIds(new Set());
      } else {
          setSelectedIds(new Set(filteredList.map(l => l.id)));
      }
  };

  const handleTransfer = async () => {
    if (!sourceAdvisorId || !targetAdvisorId) return;
    if (sourceAdvisorId === targetAdvisorId) {
        alert("El asesor origen y destino no pueden ser el mismo.");
        return;
    }

    if (transferMode === 'selection' && selectedIds.size === 0) {
        alert("Por favor selecciona al menos un lead de la lista.");
        return;
    }

    setProcessing(true);
    setResult(null);

    try {
        let leadIdsToMove: string[] = [];

        if (transferMode === 'selection') {
            leadIdsToMove = Array.from(selectedIds);
        } else {
            let query = supabase
                .from('leads')
                .select('id')
                .eq('advisor_id', sourceAdvisorId);

            if (onlyActive) {
                 const { data: activeStatuses } = await supabase.from('statuses').select('id').eq('category', 'active');
                 if (activeStatuses) {
                     query = query.in('status_id', activeStatuses.map(s => s.id));
                 }
            }

            if (transferMode === 'quantity') {
                query = query.order('registration_date', { ascending: false }).limit(quantity);
            }

            const { data, error } = await query;
            if (error) throw error;
            if (!data) throw new Error("No se encontraron leads.");
            leadIdsToMove = data.map(l => l.id);
        }

        if (leadIdsToMove.length === 0) {
            throw new Error("No hay leads para transferir.");
        }

        // 1. Obtener nombres para la nota
        const sourceAdvisor = advisors.find(a => a.id === sourceAdvisorId);
        const targetAdvisor = advisors.find(a => a.id === targetAdvisorId);
        const sourceName = sourceAdvisor?.full_name || 'Desconocido';
        const targetName = targetAdvisor?.full_name || 'Desconocido';
        const finalReason = reason.trim() || 'Reestructuración de Cartera';

        // 2. Ejecutar la actualización masiva
        const { error: updateError } = await supabase
            .from('leads')
            .update({ advisor_id: targetAdvisorId })
            .in('id', leadIdsToMove);

        if (updateError) throw updateError;

        // 3. Insertar notas de seguimiento DETALLADAS (Igual que Transferencia Unitaria)
        const notesPayload = leadIdsToMove.map(id => ({
            lead_id: id,
            // Formato idéntico al de LeadDetailModal para consistencia
            notes: `🔄 REASIGNACIÓN MASIVA\nDe: ${sourceName}\nA: ${targetName}\nMotivo: ${finalReason}`,
            date: new Date().toISOString(),
        }));

        await supabase.from('follow_ups').insert(notesPayload);

        setResult({ success: leadIdsToMove.length });
        setSelectedIds(new Set());
        setReason(''); // Resetear motivo
        
        setTimeout(() => {
            onSuccess();
            onClose();
            setResult(null);
            setSourceAdvisorId('');
            setTargetAdvisorId('');
            setTransferMode('all');
        }, 2000);

    } catch (error: any) {
        console.error(error);
        setResult({ success: 0, error: error.message || "Error desconocido" });
    } finally {
        setProcessing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reasignación Masiva de Cartera" size="xl">
      <div className="space-y-6">
        
        {/* Header Informativo */}
    <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800 flex gap-4 items-start">
        <div className="bg-amber-100 dark:bg-amber-800/50 p-2 rounded-full text-amber-600 dark:text-amber-200 mt-1">
            <TransferIcon className="w-6 h-6" />
        </div>
        <div>
            <h4 className="font-bold text-amber-900 dark:text-amber-100 text-sm uppercase">Herramienta Administrativa</h4>
            <p className="text-sm text-amber-800 dark:text-amber-200 mt-1"><p>Esta función permite reasignar múltiples leads de un asesor a otro de manera rápida y eficiente. Utilízala para balancear cargas de trabajo o en casos de renuncias.</p></p>
                </div>
        </div>

        {/* Selección de Asesores */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
            <label className="block text-xs font-bold text-red-800 dark:text-red-300 uppercase tracking-wide">
                Desde (Origen)
            </label>
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-900/50">
                    <Select 
                        value={sourceAdvisorId}
                        onChange={e => setSourceAdvisorId(e.target.value)}
                        options={[{value: '', label: '-- Seleccionar Asesor --'}, ...advisors.map(a => ({ value: a.id, label: a.full_name }))]}
                        className="bg-white mb-2"
                    />
                    {sourceAdvisorId && (
                        <div className="flex items-center justify-between text-xs text-red-700">
                            <span>Total en cartera:</span>
                            <span className="font-bold bg-white px-2 py-0.5 rounded border border-red-100">
                                {loadingCount ? '...' : totalLeads}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-2">
                <label className="block text-xs font-bold text-green-800 dark:text-green-300 uppercase tracking-wide">
                    Hacia (Destino)
                </label>
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-xl border border-green-100 dark:border-green-900/50">
                    <Select 
                        value={targetAdvisorId}
                        onChange={e => setTargetAdvisorId(e.target.value)}
                        options={[{value: '', label: '-- Seleccionar Asesor --'}, ...advisors.filter(a => a.id !== sourceAdvisorId).map(a => ({ value: a.id, label: a.full_name }))]}
                        className="bg-white"
                    />
                </div>
            </div>
        </div>

        {/* Configuración de Transferencia */}
        {sourceAdvisorId && (
            <div className="border-t border-gray-100 pt-4 animate-fade-in space-y-5">
                
                {/* Opciones Superiores */}
                <div className="flex justify-between items-center">
                    <h5 className="font-bold text-gray-800 flex items-center gap-2">
                        <UserIcon className="w-5 h-5 text-brand-secondary"/>
                        Método de Transferencia
                    </h5>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={onlyActive}
                            onChange={e => setOnlyActive(e.target.checked)}
                            className="rounded text-brand-secondary focus:ring-brand-secondary border-gray-300"
                        />
                        <span className="text-sm text-gray-600">Solo leads activos</span>
                    </label>
                </div>
                
                {/* Selector de Modo */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={() => setTransferMode('all')}
                        className={`flex-1 p-3 rounded-lg border text-left transition-all ${
                            transferMode === 'all' ? 'border-brand-secondary bg-blue-50 ring-1 ring-brand-secondary' : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'
                        }`}
                    >
                        <span className="block text-sm font-bold text-gray-900 dark:text-white">Transferir TODOS</span>
                        <span className="text-xs text-gray-500">Mueve los {totalLeads} leads disponibles.</span>
                    </button>

                    <button
                        onClick={() => setTransferMode('quantity')}
                        className={`flex-1 p-3 rounded-lg border text-left transition-all ${
                            transferMode === 'quantity' ? 'border-brand-secondary bg-blue-50 ring-1 ring-brand-secondary' : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'
                        }`}
                    >
                        <span className="block text-sm font-bold text-gray-900 dark:text-white">Por Cantidad</span>
                        <span className="text-xs text-gray-500">Mueve los X más recientes.</span>
                    </button>

                    <button
                        onClick={() => setTransferMode('selection')}
                        className={`flex-1 p-3 rounded-lg border text-left transition-all ${
                            transferMode === 'selection' ? 'border-brand-secondary bg-blue-50 ring-1 ring-brand-secondary' : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'
                        }`}
                    >
                        <span className="block text-sm font-bold text-gray-900 dark:text-white">Selección Manual</span>
                        <span className="text-xs text-gray-500">Elige uno por uno de la lista.</span>
                    </button>
                </div>

                {/* CONTENIDO ESPECÍFICO DEL MODO */}
                {transferMode === 'quantity' && (
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 animate-fade-in">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Cantidad de leads a transferir (más recientes primero):
                        </label>
                        <div className="flex items-center gap-3">
                            <input 
                                type="range" 
                                min="1" 
                                max={totalLeads} 
                                value={quantity} 
                                onChange={e => setQuantity(Number(e.target.value))}
                                className="flex-1"
                            />
                            <input 
                                type="number" 
                                value={quantity}
                                onChange={e => setQuantity(Number(e.target.value))}
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-center font-bold"
                            />
                        </div>
                    </div>
                )}

                {transferMode === 'selection' && (
                    <div className="animate-fade-in border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                        <div className="p-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                            <div className="relative w-full max-w-xs">
                                <MagnifyingGlassIcon className="absolute left-2 top-2 w-4 h-4 text-gray-400" />
                                <input 
                                    type="text" 
                                    placeholder="Buscar lead..." 
                                    value={listSearchTerm}
                                    onChange={e => setListSearchTerm(e.target.value)}
                                    className="pl-8 pr-3 py-1.5 text-xs w-full border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-secondary"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">{selectedIds.size} seleccionados</span>
                                <button onClick={toggleSelectAll} className="text-xs font-bold text-brand-secondary hover:underline">
                                    {selectedIds.size === filteredList.length ? 'Desmarcar todos' : 'Marcar todos'}
                                </button>
                            </div>
                        </div>
                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
                            {loadingList ? (
                                <div className="p-8 text-center text-gray-400 flex flex-col items-center">
                                    <ArrowPathIcon className="w-6 h-6 animate-spin mb-2"/>
                                    Cargando leads...
                                </div>
                            ) : filteredList.length === 0 ? (
                                <div className="p-8 text-center text-gray-400 italic">No se encontraron leads.</div>
                            ) : (
                                <ul className="divide-y divide-gray-100">
                                    {filteredList.map(lead => (
                                        <li key={lead.id} className="hover:bg-blue-50/50 transition-colors">
                                            <label className="flex items-center px-4 py-3 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedIds.has(lead.id)}
                                                    onChange={() => toggleSelection(lead.id)}
                                                    className="w-4 h-4 text-brand-secondary border-gray-300 rounded focus:ring-brand-secondary"
                                                />
                                                <div className="ml-3 flex-1">
                                                    <p className="text-sm font-medium text-gray-900">{lead.name}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {new Date(lead.date).toLocaleDateString()} • <span className="inline-block px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px]">{lead.status}</span>
                                                    </p>
                                                </div>
                                            </label>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                )}

                {/* NUEVO: Campo de Motivo */}
                <div>
                    <TextArea 
                        label="Motivo de la Transferencia (Aparecerá en el historial)"
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        placeholder="Ej: Renuncia del asesor, Redistribución de carga..."
                        rows={2}
                    />
                </div>
            </div>
        )}

        {/* Mensajes de Resultado */}
        {result && (
            <div className={`p-4 rounded-xl flex items-center gap-3 animate-fade-in ${result.error ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
                {result.error ? <ExclamationCircleIcon className="w-6 h-6"/> : <CheckCircleIcon className="w-6 h-6"/>}
                <div>
                    <p className="font-bold">{result.error ? 'Error' : '¡Transferencia Exitosa!'}</p>
                    <p className="text-sm">{result.error || `Se han transferido ${result.success} leads correctamente.`}</p>
                </div>
            </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="ghost" onClick={onClose} disabled={processing}>Cancelar</Button>
            <Button 
                onClick={handleTransfer} 
                disabled={processing || !sourceAdvisorId || !targetAdvisorId || (transferMode === 'selection' && selectedIds.size === 0) || (transferMode !== 'selection' && totalLeads === 0)}
                className="shadow-lg shadow-brand-secondary/20 min-w-[150px]"
            >
                {processing ? 'Procesando...' : `Transferir ${transferMode === 'selection' ? selectedIds.size : (transferMode === 'quantity' ? quantity : totalLeads)} Leads`}
            </Button>
        </div>
      </div>
    </Modal>
  );
};

export default BulkTransferModal;