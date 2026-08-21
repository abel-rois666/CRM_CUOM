import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Appointment, Profile, Status, Lead, VocationalTest } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const generateAppointmentsPDF = async (
    events: any[],
    currentDate: Date,
    advisors: Profile[] = [],
    statuses: Status[] = []
): Promise<void> => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const monthName = format(currentDate, 'MMMM yyyy', { locale: es }).toUpperCase();

    // -- Header --
    doc.setFontSize(18);
    doc.text('Reporte Mensual de Citas', 14, 20);
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Periodo: ${monthName}`, 14, 28);
    doc.text(`Generado el: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 34);

    // -- Data Processing --
    // Sort by date
    const sortedEvents = [...events].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    const tableData = sortedEvents.map(event => {
        const date = format(new Date(event.start), 'dd/MM/yyyy');
        const time = `${format(new Date(event.start), 'HH:mm')} - ${format(new Date(event.end), 'HH:mm')}`;

        // Resolve Advisor Name (if available in resource or lookup)
        let advisorName = 'N/A';
        if (event.resource?.advisor_id) {
            const advisor = advisors.find(a => a.id === event.resource.advisor_id);
            advisorName = advisor ? advisor.full_name : 'Desconocido';
        } else if (event.resource?.advisor_name) {
            advisorName = event.resource.advisor_name;
        }

        // Translation for Status
        const statusMap: Record<string, string> = {
            scheduled: 'Agendada',
            completed: 'Completada',
            canceled: 'Cancelada',
            no_show: 'No Asistió',
            pending: 'Pendiente'
        };
        const statusLabel = statusMap[event.status] || event.status;

        return [
            date,
            time,
            event.title || 'Sin Título',
            advisorName,
            statusLabel,
            event.details || ''
        ];
    });

    // -- Table Generation --
    autoTable(doc, {
        startY: 40,
        head: [['Fecha', 'Hora', 'Prospecto / Título', 'Asesor', 'Estatus', 'Notas']],
        body: tableData,
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        // Custom styling for specific columns
        columnStyles: {
            0: { cellWidth: 25 }, // Fecha
            1: { cellWidth: 25 }, // Hora
            4: { cellWidth: 25 }, // Estatus
            5: { cellWidth: 'auto' } // Notas expands
        },
        didParseCell: (data) => {
            // Colorize status column
            if (data.section === 'body' && data.column.index === 4) {
                const status = data.cell.raw;
                if (status === 'Completada') data.cell.styles.textColor = [39, 174, 96]; // Green
                if (status === 'Cancelada') data.cell.styles.textColor = [192, 57, 43]; // Red
                if (status === 'No Asistió') data.cell.styles.textColor = [127, 140, 141]; // Gray
            }
        }
    });

    // -- Footer --
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10, { align: 'right' });
        doc.text('CRM Universitario - Reporte Confidencial', 14, doc.internal.pageSize.height - 10);
    }

    doc.save(`Reporte_Citas_${monthName.replace(' ', '_')}.pdf`);
};

export const generateVocationalPDF = async (
    lead: Lead,
    testData: VocationalTest
): Promise<void> => {
    if (!testData.recommended_careers || testData.status !== 'completed') {
        throw new Error('El test no está completado o faltan datos.');
    }

    const doc = new jsPDF({ orientation: 'portrait' });
    const pageWidth = doc.internal.pageSize.width;
    
    // -- Header --
    doc.setFontSize(22);
    doc.setTextColor(30, 64, 175); // brand-primary (blue-800 equivalent)
    doc.text('Centro Universitario de Oriente', 14, 25);
    
    doc.setFontSize(16);
    doc.setTextColor(55, 65, 81); // gray-700
    doc.text('Reporte de Orientación Vocacional (CHASIDE V3)', 14, 35);
    
    // -- Lead Info --
    doc.setFontSize(11);
    doc.setTextColor(75, 85, 99); // gray-600
    doc.text(`Aspirante: ${lead.first_name} ${lead.paternal_last_name} ${lead.maternal_last_name}`, 14, 45);
    doc.text(`Contacto: ${lead.phone} | ${lead.email}`, 14, 52);
    doc.text(`Fecha del test: ${format(new Date(testData.completed_at || testData.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}`, 14, 59);

    doc.setDrawColor(229, 231, 235); // gray-200
    doc.line(14, 65, pageWidth - 14, 65);

    // -- Top 3 Careers --
    doc.setFontSize(14);
    doc.setTextColor(31, 41, 55); // gray-800
    doc.setFont('helvetica', 'bold');
    doc.text('Top 3 - Mayor Compatibilidad Vocacional', 14, 75);
    doc.setFont('helvetica', 'normal');

    const top3 = testData.recommended_careers.slice(0, 3);
    let startY = 85;
    
    top3.forEach((career, index) => {
        // Draw a soft box
        doc.setFillColor(243, 244, 246); // gray-100
        doc.roundedRect(14, startY, pageWidth - 28, 16, 2, 2, 'F');
        
        doc.setFontSize(12);
        doc.setTextColor(31, 41, 55);
        doc.text(`${index + 1}. ${career.name}`, 20, startY + 11);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 64, 175);
        doc.text(`${career.cv}% CV`, pageWidth - 40, startY + 11);
        doc.setFont('helvetica', 'normal');
        
        startY += 20;
    });

    // -- Breakdown Table --
    doc.setFontSize(14);
    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.text('Desglose Técnico', 14, startY + 10);
    doc.setFont('helvetica', 'normal');

    const AREA_LABELS: Record<string, string> = {
        C: 'C - Administrativo/Contable',
        H: 'H - Humanístico/Social',
        A: 'A - Artístico/Creativo',
        S: 'S - Ciencias de la Salud',
        I: 'I - Ingeniería/Tecnología',
        D: 'D - Defensa/Seguridad',
        E: 'E - Ciencias Exactas',
    };

    const tableData = Object.keys(AREA_LABELS).map(key => {
        const interest = testData.calculated_interests?.[key] || 0;
        const aptitude = testData.calculated_aptitudes?.[key] || 0;
        const concordance = Math.round(100 - Math.abs(interest - aptitude));
        return [
            AREA_LABELS[key],
            `${Math.round(interest)}%`,
            `${Math.round(aptitude)}%`,
            `${concordance}%`
        ];
    });

    autoTable(doc, {
        startY: startY + 16,
        head: [['Área', 'Match Intereses', 'Match Aptitudes', 'Concordancia (K)']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [30, 64, 175], textColor: 255 }, // brand-primary
        styles: { fontSize: 10, cellPadding: 4 },
        columnStyles: {
            1: { halign: 'center' },
            2: { halign: 'center' },
            3: { halign: 'center' }
        }
    });

    // -- Footer --
    const finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128); // gray-500
    doc.text('Este reporte es un instrumento de orientación y apoyo; no determina de forma definitiva la decisión profesional del aspirante.', 14, finalY, { maxWidth: pageWidth - 28, align: 'justify' });

    doc.save(`Reporte_Vocacional_${lead.first_name}_${lead.paternal_last_name}.pdf`);
};
