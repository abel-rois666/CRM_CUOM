import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { MediaCatalogItem } from '../types';
import Button from './common/Button';
import { Input } from './common/FormElements';
import TrashIcon from './icons/TrashIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';
import PaperClipIcon from './icons/PaperClipIcon';
import SparklesIcon from './icons/SparklesIcon';
import PlusIcon from './icons/PlusIcon';
import { useToast } from '../context/ToastContext';
import ConfirmationModal from './common/ConfirmationModal';

const MediaCatalogSettings: React.FC = () => {
    const [catalog, setCatalog] = useState<MediaCatalogItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [itemToDelete, setItemToDelete] = useState<{ id: string, fileUrl: string, name: string } | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { success, error: toastError } = useToast();

    const fetchCatalog = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('media_catalog')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error("Error fetching catalog:", error);
            toastError("Error al cargar el catálogo.");
        } else {
            setCatalog(data || []);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchCatalog();
    }, []);

    const calculateSHA256 = async (file: File): Promise<string> => {
        const buffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Limitar PDF a 5MB, y otros (imágenes) a 16MB
        if (file.type === 'application/pdf' && file.size > 5 * 1024 * 1024) {
            toastError("El archivo PDF excede el límite de 5MB.");
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        } else if (file.size > 16 * 1024 * 1024) {
            toastError("El archivo excede el límite de 16MB.");
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        const fileType: 'image' | 'document' = file.type.startsWith('image/') ? 'image' : 'document';
        setIsUploading(true);

        try {
            // Nombre del archivo bonito
            const originalName = file.name;
            const ext = originalName.split('.').pop() || 'bin';
            const hash = await calculateSHA256(file);
            const fileName = `${hash}.${ext}`;
            const bucket = 'official_media';

            // Subir al bucket público
            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(fileName, file, { upsert: true });
            
            if (uploadError) throw uploadError;

            // Obtener URL Pública
            const { data: publicUrlData } = supabase.storage
                .from(bucket)
                .getPublicUrl(fileName);
            
            const publicUrl = publicUrlData.publicUrl;

            // Insertar en media_catalog
            const { error: dbError } = await supabase
                .from('media_catalog')
                .insert({
                    name: originalName,
                    file_type: fileType,
                    file_url: publicUrl
                });

            if (dbError) throw dbError;

            // Refrescar lista
            fetchCatalog();
            success("Archivo subido al catálogo con éxito.");

        } catch (error: any) {
            console.error("Error subiendo archivo oficial:", error);
            toastError(`Error al subir archivo: ${error.message}`);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        
        try {
            // Intentar extraer el nombre del archivo de la URL
            const urlParts = itemToDelete.fileUrl.split('/');
            const fileName = urlParts[urlParts.length - 1];

            // 1. Borrar de base de datos
            const { error: dbError } = await supabase
                .from('media_catalog')
                .delete()
                .eq('id', itemToDelete.id);
            
            if (dbError) throw dbError;

            // 2. Borrar del bucket
            await supabase.storage
                .from('official_media')
                .remove([fileName]);

            // Refrescar
            fetchCatalog();
            success("Archivo eliminado correctamente.");
        } catch (error: any) {
            console.error("Error al borrar:", error);
            toastError(`Error al eliminar: ${error.message}`);
        } finally {
            setItemToDelete(null);
        }
    };

    const filteredCatalog = catalog.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">Catálogo Multimedia Oficial</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Archivos, imágenes promocionales y folletos que estarán disponibles para todos los asesores en el chat.
                    </p>
                </div>
                <div>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        className="hidden" 
                        accept="image/jpeg,image/png,image/webp,application/pdf" 
                    />
                    <Button 
                        onClick={() => fileInputRef.current?.click()} 
                        disabled={isUploading}
                        className="flex items-center gap-2"
                    >
                        {isUploading ? (
                            <><SparklesIcon className="w-5 h-5 animate-spin" /> Subiendo...</>
                        ) : (
                            <><PlusIcon className="w-5 h-5" /> Agregar Archivo</>
                        )}
                    </Button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
                    <Input
                        type="text"
                        placeholder="Buscar archivo por nombre..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="overflow-x-auto min-h-[300px]">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-slate-700/50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                <th className="px-6 py-3 border-b border-gray-100 dark:border-slate-700">Archivo</th>
                                <th className="px-6 py-3 border-b border-gray-100 dark:border-slate-700">Tipo</th>
                                <th className="px-6 py-3 border-b border-gray-100 dark:border-slate-700">Fecha</th>
                                <th className="px-6 py-3 border-b border-gray-100 dark:border-slate-700 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">Cargando catálogo...</td>
                                </tr>
                            ) : filteredCatalog.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                                        No se encontraron archivos en el catálogo oficial.
                                    </td>
                                </tr>
                            ) : (
                                filteredCatalog.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {item.file_type === 'image' ? 
                                                    <PaperClipIcon className="w-6 h-6 text-blue-500" /> : 
                                                    <DocumentTextIcon className="w-6 h-6 text-red-500" />
                                                }
                                                <a href={item.file_url} target="_blank" rel="noreferrer" className="text-sm font-medium text-gray-900 dark:text-white hover:text-brand-secondary">
                                                    {item.name}
                                                </a>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-gray-300">
                                                {item.file_type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(item.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => setItemToDelete({ id: item.id, fileUrl: item.file_url, name: item.name })}
                                                className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                                title="Eliminar"
                                            >
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <ConfirmationModal
                isOpen={!!itemToDelete}
                onClose={() => setItemToDelete(null)}
                onConfirm={confirmDelete}
                title="Eliminar del Catálogo"
                message={
                    <>
                        ¿Seguro que deseas eliminar <strong>{itemToDelete?.name}</strong> del catálogo?
                        <br /><br />
                        No se podrá usar más en los chats del CRM.
                    </>
                }
                confirmButtonText="Eliminar Archivo"
                confirmButtonVariant="danger"
            />
        </div>
    );
};

export default MediaCatalogSettings;
