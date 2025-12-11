import { Lead } from '../types';

export const calculateLeadScore = (lead: Lead, statuses: any[]): number => {
    // 0. Revisar Estado Definitivo ('won' o 'lost')
    const currentStatus = statuses.find(s => s.id === lead.status_id);
    if (currentStatus) {
        if (currentStatus.category === 'won') return 100;
        if (currentStatus.category === 'lost') return 0;
    }

    let score = 0;

    // 1. Perfil Completo (+10)
    if (lead.email && lead.phone && lead.program_id) {
        score += 10;
    }

    // 2. Interés Reciente (+20) - Registrado hace menos de 7 días
    const registrationDate = new Date(lead.registration_date);
    const now = new Date();
    const daysSinceRegistration = (now.getTime() - registrationDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceRegistration <= 7) {
        score += 20;
    } else if (daysSinceRegistration <= 30) {
        score += 10; // Puntos parciales si es del último mes
    }

    // 3. Citas (+40)
    if (lead.appointments && lead.appointments.length > 0) {
        const hasScheduled = lead.appointments.some(a => a.status === 'scheduled');
        const hasCompleted = lead.appointments.some(a => a.status === 'completed');

        if (hasCompleted) score += 50; // ¡Alta probabilidad!
        else if (hasScheduled) score += 40;
    }

    // 4. Interacción (+5 por nota, max 20)
    if (lead.follow_ups && lead.follow_ups.length > 0) {
        const points = Math.min(lead.follow_ups.length * 5, 20);
        score += points;
    }

    // 5. Urgencia (+15) - Cita próximamente
    if (lead.appointments) {
        const upcoming = lead.appointments.find(a =>
            a.status === 'scheduled' &&
            new Date(a.date) > now &&
            (new Date(a.date).getTime() - now.getTime()) < (48 * 60 * 60 * 1000)
        );
        if (upcoming) score += 15;
    }

    // 6. Penalización por Abandono (-10 cada 15 días sin contacto recientemente)
    // Solo si no tiene citas futuras
    const hasFutureAppointments = lead.appointments?.some(a => new Date(a.date) > now && a.status === 'scheduled');

    if (!hasFutureAppointments) {
        let lastInteraction = registrationDate;

        if (lead.follow_ups && lead.follow_ups.length > 0) {
            const lastNoteDate = lead.follow_ups
                .map(f => new Date(f.date))
                .sort((a, b) => b.getTime() - a.getTime())[0];
            lastInteraction = lastNoteDate;
        }

        const daysSinceInteraction = (now.getTime() - lastInteraction.getTime()) / (1000 * 60 * 60 * 24);

        if (daysSinceInteraction > 15) score -= 10;
        if (daysSinceInteraction > 30) score -= 10;
        if (daysSinceInteraction > 60) score -= 20;
    }

    // Normalizar entre 0 y 100
    return Math.max(0, Math.min(100, score));
};

export const getScoreBreakdown = (lead: Lead, statuses: any[]): string => {
    let breakdown: string[] = [];

    // 0. Revisar Estado Definitivo
    const currentStatus = statuses.find(s => s.id === lead.status_id);
    if (currentStatus) {
        if (currentStatus.category === 'won') {
            return `Puntuación: 100/100\n\n🎉 ¡Lead Inscrito! (Estado Ganado)`;
        }
        if (currentStatus.category === 'lost') {
            return `Puntuación: 0/100\n\n⛔ Lead Perdido (Estado Baja/Archivo)`;
        }
    }

    let score = 0;

    // 1. Perfil Completo
    if (lead.email && lead.phone && lead.program_id) {
        breakdown.push("✅ Perfil Completo (+10)");
        score += 10;
    }

    // 2. Interés Reciente
    const registrationDate = new Date(lead.registration_date);
    const now = new Date();
    const daysSinceRegistration = (now.getTime() - registrationDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceRegistration <= 7) {
        breakdown.push("🔥 Interés Reciente (<7 días) (+20)");
        score += 20;
    } else if (daysSinceRegistration <= 30) {
        breakdown.push("📅 Interés del Mes (+10)");
        score += 10;
    }

    // 3. Citas
    if (lead.appointments && lead.appointments.length > 0) {
        const hasScheduled = lead.appointments.some(a => a.status === 'scheduled');
        const hasCompleted = lead.appointments.some(a => a.status === 'completed');

        if (hasCompleted) {
            breakdown.push("🤝 Cita Completada (+50)");
            score += 50;
        } else if (hasScheduled) {
            breakdown.push("📆 Cita Programada (+40)");
            score += 40;
        }
    }

    // 4. Interacción
    if (lead.follow_ups && lead.follow_ups.length > 0) {
        const points = Math.min(lead.follow_ups.length * 5, 20);
        breakdown.push(`💬 Seguimiento (${lead.follow_ups.length} notas) (+${points})`);
        score += points;
    }

    // 5. Urgencia
    if (lead.appointments) {
        const upcoming = lead.appointments.find(a =>
            a.status === 'scheduled' &&
            new Date(a.date) > now &&
            (new Date(a.date).getTime() - now.getTime()) < (48 * 60 * 60 * 1000)
        );
        if (upcoming) {
            breakdown.push("⏰ Cita Inminente (<48h) (+15)");
            score += 15;
        }
    }

    // 6. Penalización
    const hasFutureAppointments = lead.appointments?.some(a => new Date(a.date) > now && a.status === 'scheduled');
    if (!hasFutureAppointments) {
        let lastInteraction = registrationDate;
        if (lead.follow_ups && lead.follow_ups.length > 0) {
            lastInteraction = lead.follow_ups
                .map(f => new Date(f.date))
                .sort((a, b) => b.getTime() - a.getTime())[0];
        }
        const daysSinceInteraction = (now.getTime() - lastInteraction.getTime()) / (1000 * 60 * 60 * 24);

        if (daysSinceInteraction > 15) breakdown.push("❄️ Sin seguimiento 15+ días (-10)");
        if (daysSinceInteraction > 30) breakdown.push("❄️ Sin seguimiento 30+ días (-10)");
        if (daysSinceInteraction > 60) breakdown.push("🧊 Abandono 60+ días (-20)");
    }

    const total = Math.max(0, Math.min(100, score)); // Recalculated locally to match logic
    return `Puntuación: ${total}/100\n\n${breakdown.join('\n')}`;
};

export const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200'; // Caliente
    if (score >= 40) return 'text-amber-600 bg-amber-50 border-amber-200';   // Tibio
    return 'text-slate-500 bg-slate-50 border-slate-200';                    // Frío
};

export const getScoreLabel = (score: number): string => {
    if (score >= 80) return '🔥 Caliente';
    if (score >= 40) return '⚖️ Tibio';
    return '❄️ Frío';
};
