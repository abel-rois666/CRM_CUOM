import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Appointment, Profile, Status } from '../types';
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
