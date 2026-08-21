import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CHASIDE_QUESTIONS, calculateVocationalCompatibility } from '../utils/vocationalScoring';
import { VocationalTest } from '../types';
import AcademicCapIcon from './icons/AcademicCapIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import ExclamationCircleIcon from './icons/ExclamationCircleIcon';

interface VocationalTestViewProps {
    token: string;
}

const QUESTIONS_PER_PAGE = 10;
const TOTAL_QUESTIONS = CHASIDE_QUESTIONS.length;

const VocationalTestView: React.FC<VocationalTestViewProps> = ({ token }) => {
    const [testRecord, setTestRecord] = useState<VocationalTest | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<'pending' | 'completed' | 'expired' | 'invalid'>('pending');

    const [answers, setAnswers] = useState<Record<number, boolean>>({});
    const [currentPage, setCurrentPage] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchToken = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('vocational_tests')
                    .select('*')
                    .eq('token', token)
                    .single();

                if (error) {
                    console.error("Error fetching token:", error);
                    setError("Enlace inválido o no encontrado.");
                    setStatus('invalid');
                    return;
                }

                if (data) {
                    setTestRecord(data as VocationalTest);
                    
                    if (data.status === 'completed') {
                        setStatus('completed');
                    } else if (new Date(data.expires_at) < new Date() || data.status === 'expired') {
                        setStatus('expired');
                    } else {
                        setStatus('pending');
                    }
                }
            } catch (err: any) {
                setError(err.message);
                setStatus('invalid');
            } finally {
                setLoading(false);
            }
        };

        fetchToken();
    }, [token]);

    const handleAnswer = (questionId: number, answer: boolean) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: answer
        }));
    };

    const handleNextPage = () => {
        if ((currentPage + 1) * QUESTIONS_PER_PAGE < TOTAL_QUESTIONS) {
            setCurrentPage(prev => prev + 1);
            window.scrollTo(0, 0);
        }
    };

    const handlePrevPage = () => {
        if (currentPage > 0) {
            setCurrentPage(prev => prev - 1);
            window.scrollTo(0, 0);
        }
    };

    const handleSubmit = async () => {
        if (Object.keys(answers).length < TOTAL_QUESTIONS) {
            alert("Por favor responde todas las preguntas antes de finalizar.");
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Calculate Results
            const result = calculateVocationalCompatibility(answers);

            // 2. Update Supabase
            const { error } = await supabase
                .from('vocational_tests')
                .update({
                    status: 'completed',
                    completed_at: new Date().toISOString(),
                    raw_answers: answers,
                    calculated_interests: result.areaScores.reduce((acc, curr) => ({ ...acc, [curr.area]: curr.interestNorm }), {}),
                    calculated_aptitudes: result.areaScores.reduce((acc, curr) => ({ ...acc, [curr.area]: curr.aptitudeNorm }), {}),
                    recommended_careers: result.careerRanking
                })
                .eq('token', token);

            if (error) {
                console.error("Error saving test:", error);
                alert("Ocurrió un error al guardar tus resultados. Por favor intenta de nuevo.");
                setIsSubmitting(false);
                return;
            }

            setStatus('completed');
        } catch (err) {
            console.error("Error calculating/saving:", err);
            alert("Ocurrió un error inesperado.");
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
            </div>
        );
    }

    if (status === 'invalid' || status === 'expired') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
                    <ExclamationCircleIcon className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                        {status === 'invalid' ? 'Enlace Inválido' : 'Enlace Expirado'}
                    </h2>
                    <p className="text-gray-600">
                        {error || "El enlace proporcionado ya no es válido o ha expirado. Por favor contacta a tu asesor para solicitar uno nuevo."}
                    </p>
                </div>
            </div>
        );
    }

    if (status === 'completed') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
                    <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Test Completado!</h2>
                    <p className="text-gray-600 mb-6">
                        Gracias por completar el Test de Orientación Vocacional. Hemos guardado tus respuestas exitosamente.
                    </p>
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <p className="text-sm text-blue-800 font-medium">
                            Tu asesor se pondrá en contacto contigo pronto para discutir tus resultados y explorar tus opciones universitarias.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // taking_test state
    const currentQuestions = CHASIDE_QUESTIONS.slice(currentPage * QUESTIONS_PER_PAGE, (currentPage + 1) * QUESTIONS_PER_PAGE);
    const answeredCount = Object.keys(answers).length;
    const progressPercentage = Math.round((answeredCount / TOTAL_QUESTIONS) * 100);
    const isLastPage = (currentPage + 1) * QUESTIONS_PER_PAGE >= TOTAL_QUESTIONS;
    
    // Check if current page is fully answered to enable 'Next'
    const isCurrentPageComplete = currentQuestions.every(q => answers[q.id] !== undefined);

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center p-3 bg-brand-primary/10 rounded-full mb-4">
                        <AcademicCapIcon className="w-8 h-8 text-brand-primary" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Test de Orientación Vocacional</h1>
                    <p className="text-gray-600">Descubre las áreas y carreras que mejor se adaptan a tus intereses y aptitudes.</p>
                </div>

                {/* Progress Bar */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6 sticky top-4 z-10">
                    <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                        <span>Progreso</span>
                        <span>{answeredCount} de {TOTAL_QUESTIONS} ({progressPercentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                            className="bg-brand-primary h-2.5 rounded-full transition-all duration-300 ease-out" 
                            style={{ width: `${progressPercentage}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                        Responde honestamente con un "Sí" o un "No" a cada pregunta. No hay respuestas correctas o incorrectas.
                    </p>
                </div>

                {/* Questions List */}
                <div className="space-y-4 mb-8">
                    {currentQuestions.map((q, index) => {
                        const globalIndex = (currentPage * QUESTIONS_PER_PAGE) + index + 1;
                        const currentAnswer = answers[q.id];

                        return (
                            <div key={q.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 transition-all hover:border-brand-primary/30">
                                <p className="text-lg text-gray-800 mb-4 font-medium">
                                    <span className="text-gray-400 mr-2">{globalIndex}.</span>
                                    {q.text}
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleAnswer(q.id, true)}
                                        className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all font-semibold ${
                                            currentAnswer === true 
                                            ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' 
                                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        Sí
                                    </button>
                                    <button
                                        onClick={() => handleAnswer(q.id, false)}
                                        className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all font-semibold ${
                                            currentAnswer === false 
                                            ? 'border-gray-800 bg-gray-800 text-white' 
                                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        No
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Pagination Controls */}
                <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <button
                        onClick={handlePrevPage}
                        disabled={currentPage === 0 || isSubmitting}
                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Anterior
                    </button>
                    
                    <span className="text-sm font-medium text-gray-500">
                        Página {currentPage + 1} de {Math.ceil(TOTAL_QUESTIONS / QUESTIONS_PER_PAGE)}
                    </span>

                    {!isLastPage ? (
                        <button
                            onClick={handleNextPage}
                            disabled={!isCurrentPageComplete || isSubmitting}
                            className="px-6 py-2 bg-brand-primary text-white rounded-lg font-medium hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Siguiente
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={answeredCount < TOTAL_QUESTIONS || isSubmitting}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Guardando...
                                </>
                            ) : (
                                'Finalizar Test'
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VocationalTestView;
