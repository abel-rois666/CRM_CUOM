import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { VocationalTest, Profile, Lead } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';
import PlusIcon from './icons/PlusIcon';
import ClipboardIcon from './icons/ClipboardIcon';
import LinkIcon from './icons/LinkIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';
import { generateVocationalPDF } from '../utils/reports';

interface VocationalTabProps {
    lead: Lead;
    currentUser: Profile;
}

const AREA_LABELS: Record<string, string> = {
    C: 'Administrativo',
    H: 'Humanístico',
    A: 'Artístico',
    S: 'Salud',
    I: 'Ingeniería',
    D: 'Defensa',
    E: 'Exactas',
};

const VocationalTab: React.FC<VocationalTabProps> = ({ lead, currentUser }) => {
    const [tests, setTests] = useState<VocationalTest[]>([]);
    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTests = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('vocational_tests')
                .select('*')
                .eq('lead_id', lead.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTests(data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTests();
    }, [lead.id]);

    const generateTest = async () => {
        setIsGenerating(true);
        try {
            const { data, error } = await supabase
                .from('vocational_tests')
                .insert({
                    lead_id: lead.id,
                    created_by: currentUser.id,
                })
                .select()
                .single();

            if (error) throw error;
            if (data) {
                setTests([data, ...tests]);
            }
        } catch (err: any) {
            alert(`Error al generar test: ${err.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const copyToClipboard = (token: string) => {
        const url = `${window.location.origin}/?test=true&token=${token}`;
        navigator.clipboard.writeText(url);
        alert('¡Enlace copiado al portapapeles!');
    };

    const openWhatsApp = (token: string) => {
        const url = `${window.location.origin}/?test=true&token=${token}`;
        const message = `¡Hola! Aquí tienes el enlace para realizar tu Test de Orientación Vocacional: ${url}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    };

    const handleDownloadPDF = async (testData: VocationalTest) => {
        try {
            await generateVocationalPDF(lead, testData);
        } catch (err: any) {
            alert(`Error al generar PDF: ${err.message}`);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Cargando historial de tests...</div>;
    }

    const hasPendingTest = tests.some(t => t.status === 'pending');

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-bold text-gray-900">Orientación Vocacional</h3>
                    <p className="text-sm text-gray-500">Resultados del Test CHASIDE V3</p>
                </div>
                <button
                    onClick={generateTest}
                    disabled={isGenerating || hasPendingTest}
                    className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <PlusIcon className="w-5 h-5 mr-2" />
                    {isGenerating ? 'Generando...' : 'Generar Nuevo Test'}
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm">
                    {error}
                </div>
            )}

            {tests.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-gray-500 mb-4">No hay tests generados para este lead.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {tests.map((test) => {
                        if (test.status === 'pending') {
                            const testUrl = `${window.location.origin}/?test=true&token=${test.token}`;
                            return (
                                <div key={test.id} className="p-6 bg-white border border-amber-200 rounded-xl shadow-sm">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                                Test Pendiente
                                            </span>
                                            <p className="text-sm text-gray-500 mt-2">
                                                Expira el: {new Date(test.expires_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-4 p-3 bg-gray-50 rounded-lg flex items-center justify-between gap-4">
                                        <div className="flex items-center overflow-hidden">
                                            <LinkIcon className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0" />
                                            <span className="text-sm text-gray-600 truncate">{testUrl}</span>
                                        </div>
                                        <div className="flex gap-2 flex-shrink-0">
                                            <button
                                                onClick={() => copyToClipboard(test.token)}
                                                className="p-2 text-gray-500 hover:text-brand-primary hover:bg-brand-primary/10 rounded-md transition-colors"
                                                title="Copiar Enlace"
                                            >
                                                <ClipboardIcon className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => openWhatsApp(test.token)}
                                                className="px-3 py-1.5 bg-[#25D366] text-white text-sm font-medium rounded-md hover:bg-[#128C7E] transition-colors"
                                            >
                                                Enviar WhatsApp
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        if (test.status === 'completed' && test.recommended_careers && test.calculated_interests && test.calculated_aptitudes) {
                            // Format data for Recharts
                            const radarData = Object.keys(test.calculated_interests).map(key => ({
                                subject: AREA_LABELS[key] || key,
                                interest: test.calculated_interests![key],
                                aptitude: test.calculated_aptitudes![key],
                                fullMark: 100,
                            }));

                            const topCareers = test.recommended_careers.slice(0, 3);

                            return (
                                <div key={test.id} className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
                                    <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                                        <div>
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                Completado
                                            </span>
                                            <p className="text-sm text-gray-500 mt-1">
                                                Realizado el: {new Date(test.completed_at!).toLocaleString()}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleDownloadPDF(test)}
                                            className="flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium"
                                        >
                                            <DocumentTextIcon className="w-4 h-4 mr-2" />
                                            Descargar PDF
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        {/* Top Careers Bar Chart */}
                                        <div>
                                            <h4 className="text-md font-semibold text-gray-800 mb-4 text-center">Top 3 Compatibilidad (%)</h4>
                                            <div className="h-64">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={topCareers} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                                        <XAxis type="number" domain={[0, 100]} />
                                                        <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                                                        <Tooltip formatter={(value: number) => `${value}%`} />
                                                        <Bar dataKey="cv" fill="#0EA5E9" name="Compatibilidad Vocacional" radius={[0, 4, 4, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>

                                        {/* Radar Chart for Areas */}
                                        <div>
                                            <h4 className="text-md font-semibold text-gray-800 mb-4 text-center">Perfil CHASIDE</h4>
                                            <div className="h-64">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                                        <PolarGrid />
                                                        <PolarAngleAxis dataKey="subject" tick={{fontSize: 10}} />
                                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                                                        <Radar name="Intereses" dataKey="interest" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.4} />
                                                        <Radar name="Aptitudes" dataKey="aptitude" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.4} />
                                                        <Legend wrapperStyle={{fontSize: '12px'}} />
                                                        <Tooltip />
                                                    </RadarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Career Breakdown Table */}
                                    <div className="mt-8">
                                        <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">Detalle del Ranking</h4>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
                                                <thead className="bg-gray-50 text-gray-600">
                                                    <tr>
                                                        <th className="px-4 py-2 font-medium">Carrera</th>
                                                        <th className="px-4 py-2 font-medium">Match Intereses</th>
                                                        <th className="px-4 py-2 font-medium">Match Aptitudes</th>
                                                        <th className="px-4 py-2 font-medium">Concordancia (K)</th>
                                                        <th className="px-4 py-2 font-medium font-bold text-brand-primary">CV Final</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 bg-white">
                                                    {test.recommended_careers.map((career, idx) => (
                                                        <tr key={idx} className={idx < 3 ? 'bg-blue-50/30' : ''}>
                                                            <td className="px-4 py-3 font-medium text-gray-800">{career.name}</td>
                                                            <td className="px-4 py-3 text-gray-600">{career.matchInterests}%</td>
                                                            <td className="px-4 py-3 text-gray-600">{career.matchAptitudes}%</td>
                                                            <td className="px-4 py-3 text-gray-600">{career.concordance}%</td>
                                                            <td className="px-4 py-3 font-bold text-brand-primary">{career.cv}%</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            );
                        }
                        
                        return null; // Expired cases can be handled here if needed
                    })}
                </div>
            )}
        </div>
    );
};

export default VocationalTab;
