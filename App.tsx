import React, { useState, useEffect } from 'react';
import useLocalStorage from './hooks/useLocalStorage';
import Header from './components/Header';
import LeadList from './components/LeadList';
import LeadFormModal from './components/LeadFormModal';
import LeadDetailModal from './components/LeadDetailModal';
import SettingsModal from './components/SettingsModal';
import ReportModal from './components/ReportModal';
import { Lead, Advisor, Status, Source, Appointment, FollowUp, Licenciatura, StatusChange } from './types';
import InitialSetup from './components/InitialSetup';

const initialAdvisors: Advisor[] = [
  { id: '1', name: 'Ana García', email: 'ana.garcia@university.edu' },
  { id: '2', name: 'Carlos Rodríguez', email: 'carlos.rodriguez@university.edu' },
  { id: '3', name: 'Laura Martinez', email: 'laura.martinez@university.edu' },
  { id: '4', name: 'David Fernández', email: 'david.fernandez@university.edu' },
  { id: '5', name: 'Sofía Pérez', email: 'sofia.perez@university.edu' }
];
const initialStatuses: Status[] = [
  { id: 's1', name: 'Nuevo', color: 'bg-blue-500' },
  { id: 's2', name: 'Contactado', color: 'bg-yellow-500' },
  { id: 's3', name: 'Interesado', color: 'bg-green-500' },
  { id: 's4', name: 'Inscrito', color: 'bg-purple-500' },
  { id: 's5', name: 'Rechazado', color: 'bg-red-500' },
  { id: 's6', name: 'Citado', color: 'bg-cyan-500' }
];
const initialSources: Source[] = [
  { id: 'src1', name: 'Facebook' },
  { id: 'src2', name: 'Informe Presencial' },
  { id: 'src3', name: 'Sitio Web' },
  { id: 'src4', name: 'Referido' }
];

const initialLicenciaturas: Licenciatura[] = [
    { id: 'p1', name: 'Ingeniería en Sistemas' },
    { id: 'p2', name: 'Administración de Empresas' },
    { id: 'p3', name: 'Diseño Gráfico' },
    { id: 'p4', name: 'Psicología' },
    { id: 'p5', name: 'Derecho' },
];

const initialLeads: Lead[] = [
  {
    id: 'l1',
    firstName: 'Elena',
    paternalLastName: 'Gómez',
    email: 'elena.gomez@example.com',
    phone: '123-456-7890',
    programId: 'p1',
    statusId: 's1',
    advisorId: '1',
    sourceId: 'src1',
    registrationDate: new Date('2023-10-26T10:00:00Z').toISOString(),
    followUps: [],
    appointments: [],
    statusHistory: [],
  },
  {
    id: 'l2',
    firstName: 'Marco Antonio',
    paternalLastName: 'Reyes',
    email: 'marco.antonio@example.com',
    phone: '234-567-8901',
    programId: 'p2',
    statusId: 's6',
    advisorId: '2',
    sourceId: 'src2',
    registrationDate: new Date('2023-10-25T11:30:00Z').toISOString(),
    followUps: [{ id: 'f1', date: new Date(Date.now() - 86400000).toISOString(), notes: 'Llamada, se dejó buzón de voz.' }],
    appointments: [
      {
        id: 'apt1',
        title: 'Tour del Campus',
        date: new Date(Date.now() + 86400000 * 3).toISOString(),
        duration: 60,
        details: 'Discutir los pasos finales de inscripción y las instalaciones del campus.',
        status: 'scheduled',
      },
      {
        id: 'apt_past_1',
        title: 'Llamada Informativa',
        date: new Date('2023-10-20T10:00:00Z').toISOString(),
        duration: 30,
        details: 'Primera llamada para discutir intereses.',
        status: 'completed',
      }
    ],
    statusHistory: [],
  },
  {
    id: 'l3',
    firstName: 'Isabella',
    paternalLastName: 'Castillo',
    email: 'isabella.castillo@example.com',
    phone: '345-678-9012',
    programId: 'p3',
    statusId: 's3',
    advisorId: '3',
    sourceId: 'src3',
    registrationDate: new Date('2023-10-24T15:00:00Z').toISOString(),
    followUps: [
      { id: 'f2', date: new Date(Date.now() - 172800000).toISOString(), notes: 'Contacto inicial por correo electrónico.' },
      { id: 'f3', date: new Date(Date.now() - 86400000).toISOString(), notes: 'Llamada telefónica, muy interesada en los requisitos del portafolio.' }
    ],
    appointments: [],
    statusHistory: [],
  }
];

export interface InitialData {
    advisors: Advisor[];
    statuses: Status[];
    sources: Source[];
    licenciaturas: Licenciatura[];
    leads: Lead[];
}

const demoCsvData = `firstName,paternalLastName,maternalLastName,email,phone,programName,statusName,advisorName,advisorEmail,sourceName,registrationDate
Javier,Morales,Santos,javier.morales@example.com,555-0101,"Ingeniería en Sistemas",Nuevo,"Ana García",ana.garcia@university.edu,Facebook,2024-05-01T09:15:00Z
Sofia,Hernández,Vega,sofia.hernandez@example.com,555-0102,"Administración de Empresas",Contactado,"Carlos Rodríguez",carlos.rodriguez@university.edu,Sitio Web,2024-05-02T11:00:00Z
Mateo,Jiménez,Rojas,mateo.jimenez@example.com,555-0103,"Diseño Gráfico",Interesado,"Laura Martinez",laura.martinez@university.edu,Referido,2024-05-03T14:30:00Z
Valentina,López,Mendoza,valentina.lopez@example.com,555-0104,Psicología,Citado,"David Fernández",david.fernandez@university.edu,"Informe Presencial",2024-05-04T16:45:00Z
Leonardo,Díaz,Cruz,leonardo.diaz@example.com,555-0105,Derecho,Inscrito,"Sofía Pérez",sofia.perez@university.edu,Facebook,2024-05-05T10:00:00Z
Camila,Sánchez,Flores,camila.sanchez@example.com,555-0106,"Ingeniería en Sistemas",Rechazado,"Ana García",ana.garcia@university.edu,Sitio Web,2024-05-06T13:20:00Z
Sebastián,Ramírez,Gómez,sebastian.ramirez@example.com,555-0107,"Administración de Empresas",Nuevo,"Carlos Rodríguez",carlos.rodriguez@university.edu,Referido,2024-05-07T15:00:00Z
"María José",Gutiérrez,Ortiz,mariajose.gutierrez@example.com,555-0108,"Diseño Gráfico",Contactado,"Laura Martinez",laura.martinez@university.edu,"Informe Presencial",2024-05-08T17:10:00Z
`;

const App: React.FC = () => {
  const [advisors, setAdvisors] = useLocalStorage<Advisor[]>('crm_advisors', []);
  const [statuses, setStatuses] = useLocalStorage<Status[]>('crm_statuses', []);
  const [sources, setSources] = useLocalStorage<Source[]>('crm_sources', []);
  const [licenciaturas, setLicenciaturas] = useLocalStorage<Licenciatura[]>('crm_licenciaturas', []);
  const [leads, setLeads] = useLocalStorage<Lead[]>('crm_leads', []);

  const [needsSetup, setNeedsSetup] = useState(false);
  const [isLeadFormOpen, setLeadFormOpen] = useState(false);
  const [isDetailViewOpen, setDetailViewOpen] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isReportModalOpen, setReportModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const advisorsData = window.localStorage.getItem('crm_advisors');
    if (!advisorsData || advisorsData === '[]') {
      setNeedsSetup(true);
    }
    setLoading(false);
  }, []);

  const handleSetupComplete = (data: InitialData) => {
    setAdvisors(data.advisors);
    setStatuses(data.statuses);
    setSources(data.sources);
    setLicenciaturas(data.licenciaturas);
    setLeads(data.leads);
    setNeedsSetup(false);
  };

  const handleAddNew = () => {
    setSelectedLead(null);
    setLeadFormOpen(true);
  };

  const handleEdit = (lead: Lead) => {
    setSelectedLead(lead);
    setLeadFormOpen(true);
  };

  const handleViewDetails = (lead: Lead) => {
    setSelectedLead(lead);
    setDetailViewOpen(true);
  };

  const handleDelete = (leadId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este lead?')) {
      setLeads(leads.filter(lead => lead.id !== leadId));
    }
  };

  const handleSaveLead = (lead: Lead) => {
    const index = leads.findIndex(l => l.id === lead.id);
    if (index > -1) { // Editing existing lead
      const oldLead = leads[index];
      let finalLead = { ...oldLead, ...lead };
      
      if (oldLead.statusId !== lead.statusId) {
        const newStatusChange: StatusChange = {
          id: new Date().toISOString(),
          oldStatusId: oldLead.statusId,
          newStatusId: lead.statusId,
          date: new Date().toISOString(),
        };
        finalLead.statusHistory = [...oldLead.statusHistory, newStatusChange];
      }
      
      const updatedLeads = [...leads];
      updatedLeads[index] = finalLead;
      setLeads(updatedLeads);

    } else { // Creating new lead
      const newStatusChange: StatusChange = {
        id: new Date().toISOString(),
        oldStatusId: null,
        newStatusId: lead.statusId,
        date: new Date().toISOString(),
      };
      setLeads([...leads, { ...lead, statusHistory: [newStatusChange] }]);
    }
    setLeadFormOpen(false);
  };

  const handleUpdateLeadDetails = (leadId: string, updates: Partial<Lead>) => {
    let changedLead: Lead | null = null;
    const newLeads = leads.map(l => {
        if (l.id === leadId) {
            let finalUpdates: Partial<Lead> & { statusHistory?: StatusChange[] } = { ...updates };
            if (updates.statusId && updates.statusId !== l.statusId) {
                const newStatusChange: StatusChange = {
                    id: new Date().toISOString(),
                    oldStatusId: l.statusId,
                    newStatusId: updates.statusId,
                    date: new Date().toISOString(),
                };
                finalUpdates.statusHistory = [...(l.statusHistory || []), newStatusChange];
            }
            const updatedLead = { ...l, ...finalUpdates };
            changedLead = updatedLead;
            return updatedLead;
        }
        return l;
    });
    setLeads(newLeads);
    if (changedLead && selectedLead?.id === leadId) {
        setSelectedLead(changedLead);
    }
};

  const handleAddFollowUp = (leadId: string, followUp: Omit<FollowUp, 'id'>) => {
    const newLeads = leads.map(lead =>
      lead.id === leadId ? { ...lead, followUps: [...lead.followUps, { ...followUp, id: new Date().toISOString() }] } : lead
    );
    setLeads(newLeads);
    if (selectedLead && selectedLead.id === leadId) {
      const updatedLead = newLeads.find(l => l.id === leadId);
      if (updatedLead) {
        setSelectedLead(updatedLead);
      }
    }
  };

  const handleDeleteFollowUp = (leadId: string, followUpId: string) => {
    const newLeads = leads.map(lead =>
      lead.id === leadId ? { ...lead, followUps: lead.followUps.filter(f => f.id !== followUpId) } : lead
    );
    setLeads(newLeads);
    if (selectedLead && selectedLead.id === leadId) {
      const updatedLead = newLeads.find(l => l.id === leadId);
      if (updatedLead) {
        setSelectedLead(updatedLead);
      }
    }
  };

  const handleSaveAppointment = (leadId: string, appointmentData: Omit<Appointment, 'id' | 'status'>, appointmentIdToEdit?: string) => {
    const citadoStatusId = statuses.find(s => s.name === 'Citado')?.id;
    let changedLead: Lead | null = null;
    const newLeads = leads.map(lead => {
      if (lead.id === leadId) {
        let updatedAppointments: Appointment[];

        if (appointmentIdToEdit) {
            updatedAppointments = lead.appointments.map(appt => 
                appt.id === appointmentIdToEdit ? { ...appt, ...appointmentData } : appt
            );
        } else {
            const newAppointment: Appointment = {
                id: new Date().toISOString(),
                ...appointmentData,
                status: 'scheduled',
            };
            updatedAppointments = [...lead.appointments, newAppointment];
        }
        
        const hasScheduledAppointment = updatedAppointments.some(a => a.status === 'scheduled');
        let statusUpdate = {};
        let statusHistoryUpdate = {};

        if (hasScheduledAppointment && citadoStatusId && lead.statusId !== 's4' && lead.statusId !== citadoStatusId) {
            statusUpdate = { statusId: citadoStatusId };
            const newStatusChange: StatusChange = {
                id: new Date().toISOString(),
                oldStatusId: lead.statusId,
                newStatusId: citadoStatusId,
                date: new Date().toISOString(),
            };
            statusHistoryUpdate = { statusHistory: [...(lead.statusHistory || []), newStatusChange] };
        }

        changedLead = { ...lead, appointments: updatedAppointments, ...statusUpdate, ...statusHistoryUpdate };
        return changedLead;
      }
      return lead;
    });
    setLeads(newLeads);
    if (changedLead && selectedLead?.id === leadId) {
      setSelectedLead(changedLead);
    }
  };

 const handleUpdateAppointmentStatus = (leadId: string, appointmentId: string, status: 'completed' | 'canceled') => {
    let changedLead: Lead | null = null;
    const newLeads = leads.map(lead => {
        if (lead.id === leadId) {
            const updatedAppointments = lead.appointments.map(appt =>
                appt.id === appointmentId ? { ...appt, status } : appt
            );
            
            const hasOtherScheduled = updatedAppointments.some(a => a.status === 'scheduled');
            const contactadoStatusId = statuses.find(s => s.name === 'Contactado')?.id;
            let statusUpdate = {};
            let statusHistoryUpdate = {};

            if (!hasOtherScheduled && contactadoStatusId && lead.statusId === 's6') {
                statusUpdate = { statusId: contactadoStatusId };
                const newStatusChange: StatusChange = {
                    id: new Date().toISOString(),
                    oldStatusId: lead.statusId,
                    newStatusId: contactadoStatusId,
                    date: new Date().toISOString(),
                };
                statusHistoryUpdate = { statusHistory: [...(lead.statusHistory || []), newStatusChange] };
            }

            changedLead = { ...lead, appointments: updatedAppointments, ...statusUpdate, ...statusHistoryUpdate };
            return changedLead;
        }
        return lead;
    });

    setLeads(newLeads);

    if (changedLead && selectedLead?.id === leadId) {
        setSelectedLead(changedLead);
    }
};

const handleDeleteAppointment = (leadId: string, appointmentId: string) => {
    let changedLead: Lead | null = null;
    const newLeads = leads.map(lead => {
        if (lead.id === leadId) {
            const updatedAppointments = lead.appointments.filter(appt => appt.id !== appointmentId);
            
            const hasOtherScheduled = updatedAppointments.some(a => a.status === 'scheduled');
            const contactadoStatusId = statuses.find(s => s.name === 'Contactado')?.id;
            let statusUpdate = {};
            let statusHistoryUpdate = {};

            if (!hasOtherScheduled && contactadoStatusId && lead.statusId === 's6') {
                statusUpdate = { statusId: contactadoStatusId };
                 const newStatusChange: StatusChange = {
                    id: new Date().toISOString(),
                    oldStatusId: lead.statusId,
                    newStatusId: contactadoStatusId,
                    date: new Date().toISOString(),
                };
                statusHistoryUpdate = { statusHistory: [...(lead.statusHistory || []), newStatusChange] };
            }

            changedLead = { ...lead, appointments: updatedAppointments, ...statusUpdate, ...statusHistoryUpdate };
            return changedLead;
        }
        return lead;
    });
    setLeads(newLeads);
    if (changedLead && selectedLead?.id === leadId) {
        setSelectedLead(changedLead);
    }
};


  if (needsSetup) {
    return <InitialSetup onSetupComplete={handleSetupComplete} demoData={{ advisors: initialAdvisors, statuses: initialStatuses, sources: initialSources, licenciaturas: initialLicenciaturas, leads: initialLeads }} demoCsvData={demoCsvData} />;
  }
  
  return (
    <div className="min-h-screen bg-gray-100">
      <Header onOpenSettings={() => setSettingsOpen(true)} />
      <main>
        <LeadList
          loading={loading}
          leads={leads}
          advisors={advisors}
          statuses={statuses}
          licenciaturas={licenciaturas}
          onAddNew={handleAddNew}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onViewDetails={handleViewDetails}
          onOpenReports={() => setReportModalOpen(true)}
        />
      </main>

      {isLeadFormOpen && (
        <LeadFormModal
          isOpen={isLeadFormOpen}
          onClose={() => setLeadFormOpen(false)}
          onSave={handleSaveLead}
          leadToEdit={selectedLead}
          advisors={advisors}
          statuses={statuses}
          sources={sources}
          licenciaturas={licenciaturas}
        />
      )}

      {isDetailViewOpen && selectedLead && (
        <LeadDetailModal
          isOpen={isDetailViewOpen}
          onClose={() => setDetailViewOpen(false)}
          lead={selectedLead}
          advisors={advisors}
          statuses={statuses}
          sources={sources}
          licenciaturas={licenciaturas}
          onAddFollowUp={handleAddFollowUp}
          onDeleteFollowUp={handleDeleteFollowUp}
          onUpdateLead={handleUpdateLeadDetails}
          onSaveAppointment={handleSaveAppointment}
          onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
          onDeleteAppointment={handleDeleteAppointment}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setSettingsOpen(false)}
          advisors={advisors}
          statuses={statuses}
          sources={sources}
          licenciaturas={licenciaturas}
          onAdvisorsUpdate={setAdvisors}
          onStatusesUpdate={setStatuses}
          onSourcesUpdate={setSources}
          onLicenciaturasUpdate={setLicenciaturas}
        />
      )}

      {isReportModalOpen && (
        <ReportModal 
            isOpen={isReportModalOpen}
            onClose={() => setReportModalOpen(false)}
            leads={leads}
            statuses={statuses}
            advisors={advisors}
            sources={sources}
        />
      )}
    </div>
  );
};

export default App;
