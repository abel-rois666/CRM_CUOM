import React, { useState, useEffect } from 'react';
import Modal from './common/Modal';
import Button from './common/Button';
import { StatusCategoryMetadata } from '../types';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';

interface CategorySettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    categories: StatusCategoryMetadata[];
    onUpdate: () => void;
}

const tailwindColors = [
    { name: 'Azul', class: 'text-brand-primary dark:text-blue-300', bg: 'bg-brand-primary' },
    { name: 'Verde', class: 'text-green-600 dark:text-green-400', bg: 'bg-green-600' },
    { name: 'Rojo', class: 'text-red-600 dark:text-red-400', bg: 'bg-red-600' },
    { name: 'Amarillo', class: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-600' },
    { name: 'Morado', class: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-600' },
    { name: 'Gris', class: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-600' },
];

const emojiOptions = [
    { label: 'Rayo', value: '⚡' },
    { label: 'Graduación', value: '🎓' },
    { label: 'Tache', value: '❌' },
    { label: 'Check', value: '✅' },
    { label: 'Reloj', value: '🕒' },
    { label: 'Fuego', value: '🔥' },
    { label: 'Maletín', value: '💼' },
    { label: 'Calendario', value: '📅' },
    { label: 'Usuario', value: '👤' },
    { label: 'Teléfono', value: '📞' },
    { label: 'Email', value: '📧' },
    { label: 'Dinero', value: '💰' },
    { label: 'Alerta', value: '⚠️' },
    { label: 'Stop', value: '🛑' },
    { label: 'Estrella', value: '⭐' },
    { label: 'Corazón', value: '❤️' },
    { label: 'Bandera', value: '🚩' },
    { label: 'Trofeo', value: '🏆' }
];

const CategorySettingsModal: React.FC<CategorySettingsModalProps> = ({ isOpen, onClose, categories, onUpdate }) => {
    const { success, error } = useToast();
    const [localCategories, setLocalCategories] = useState<StatusCategoryMetadata[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen && categories.length > 0) {
            setLocalCategories(JSON.parse(JSON.stringify(categories)));
        }
    }, [isOpen, categories]);

    const handleChange = (index: number, field: keyof StatusCategoryMetadata, value: any) => {
        const updated = [...localCategories];
        updated[index] = { ...updated[index], [field]: value };
        setLocalCategories(updated);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const updates = localCategories.map(cat => ({
                key: cat.key,
                label: cat.label,
                icon: cat.icon,
                color: cat.color,
                order_index: cat.order_index
            }));

            const { error: upsertError } = await supabase
                .from('status_categories')
                .upsert(updates);

            if (upsertError) throw upsertError;

            success('Categorías actualizadas correctamente');
            onUpdate();
            onClose();
        } catch (err: any) {
            console.error('Error saving categories:', err);
            error('Error al guardar cambios');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Personalizar Categorías" size="2xl">
            <div className="space-y-6">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Personaliza cómo se ven las pestañas de estado en tu CRM.
                    <br />
                    <span className="text-xs italic">* Las llaves internas (active, won, lost) no cambian para mantener la integridad de los datos.</span>
                </p>

                <div className="grid gap-4">
                    {localCategories.sort((a, b) => a.order_index - b.order_index).map((cat, index) => (
                        <div key={cat.key} className="bg-gray-50 dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 flex gap-4 items-end">

                            <div className="flex-1">
                                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                                    Nombre ({cat.key})
                                </label>
                                <input
                                    type="text"
                                    value={cat.label}
                                    onChange={(e) => handleChange(index, 'label', e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                                    placeholder="Ej. En Proceso"
                                />
                            </div>

                            <div className="w-24">
                                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                                    Ícono
                                </label>
                                <select
                                    value={cat.icon}
                                    onChange={(e) => handleChange(index, 'icon', e.target.value)}
                                    className="w-full px-2 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-lg"
                                >
                                    {emojiOptions.map(emoji => (
                                        <option key={emoji.value} value={emoji.value}>
                                            {emoji.value}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="w-32">
                                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                                    Color
                                </label>
                                <select
                                    value={cat.color}
                                    onChange={(e) => handleChange(index, 'color', e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                                >
                                    {tailwindColors.map(c => (
                                        <option key={c.name} value={c.class}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className={`p-2 rounded-lg border bg-white dark:bg-slate-900 flex items-center justify-center w-12 h-10 ${cat.color}`}>
                                {cat.icon}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t dark:border-slate-700">
                    <Button variant="secondary" onClick={onClose} disabled={saving}>
                        Cancelar
                    </Button>
                    <Button variant="primary" onClick={handleSave} isLoading={saving}>
                        Guardar Cambios
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default CategorySettingsModal;
