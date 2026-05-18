// components/LegalPolicies.tsx
// ---------------------------------------------------------------------------
// Página pública de políticas legales — NO requiere autenticación.
// Requerida para el App Review de Meta / WhatsApp Cloud API.
// URL de acceso: /#/legal  (ver integración en App.tsx)
// ---------------------------------------------------------------------------
import React, { useEffect } from 'react';

// ---------------------------------------------------------------------------
// Helpers de UI internos
// ---------------------------------------------------------------------------
const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4 pb-2 border-b-2 border-green-500">
    {children}
  </h2>
);

const SubTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">{children}</h3>
);

const Paragraph: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-gray-700 leading-relaxed mb-3">{children}</p>
);

const NavAnchor: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
  <a
    href={href}
    className="px-4 py-2 rounded-full text-sm font-semibold border border-green-600 text-green-700 hover:bg-green-600 hover:text-white transition-all duration-150"
  >
    {children}
  </a>
);

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
const LegalPolicies: React.FC = () => {
  const LAST_UPDATED = '15 de mayo de 2025';
  const CONTACT_EMAIL = 'privacidad@cuom.edu.mx';
  const ORG_NAME = 'Centro Universitario Oriente de México (CUOM)';

  // Scroll suave al ancla al cargar si hay hash en la URL
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      const el = document.getElementById(hash);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Logotipo textual */}
            <div className="w-9 h-9 rounded-xl bg-green-600 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
              CU
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-tight">CUOM</p>
              <p className="text-xs text-gray-500 leading-tight">Portal Legal</p>
            </div>
          </div>

          <button
            onClick={() => { window.location.hash = ''; window.location.href = '/'; }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-green-600 text-white hover:bg-green-700 active:scale-95 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Volver al inicio
          </button>
        </div>
      </header>

      {/* ── Navegación rápida por anclas ───────────────────────────────── */}
      <div className="bg-green-50 border-b border-green-100">
        <div className="max-w-4xl mx-auto px-6 py-3 flex flex-wrap gap-2">
          <NavAnchor href="#privacidad">🔒 Política de Privacidad</NavAnchor>
          <NavAnchor href="#terminos">📋 Términos de Servicio</NavAnchor>
          <NavAnchor href="#eliminacion">🗑️ Eliminación de Datos</NavAnchor>
        </div>
      </div>

      {/* ── Contenido principal ────────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto px-6 py-10 pb-20">

        {/* Hero introductorio */}
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-8 mb-8">
          <h1 className="text-3xl font-black text-gray-900 mb-3">
            Políticas Legales y Privacidad
          </h1>
          <p className="text-gray-600 leading-relaxed">
            El <strong>{ORG_NAME}</strong> se compromete a proteger la privacidad y los derechos
            digitales de sus prospectos y usuarios. Este documento describe cómo recopilamos,
            usamos y protegemos tu información personal.
          </p>
          <p className="text-xs text-gray-400 mt-4">
            Última actualización: <strong>{LAST_UPDATED}</strong>
          </p>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            SECCIÓN 1 — POLÍTICA DE PRIVACIDAD
        ════════════════════════════════════════════════════════════════ */}
        <section id="privacidad" className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 mb-6 scroll-mt-20">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🔒</span>
            <SectionTitle>Política de Privacidad</SectionTitle>
          </div>

          <SubTitle>1. Responsable del Tratamiento</SubTitle>
          <Paragraph>
            El responsable del tratamiento de tus datos personales es el <strong>{ORG_NAME}</strong>,
            con contacto oficial en <a href={`mailto:${CONTACT_EMAIL}`} className="text-green-700 underline hover:text-green-600">{CONTACT_EMAIL}</a>.
          </Paragraph>

          <SubTitle>2. Datos que recopilamos</SubTitle>
          <Paragraph>
            A través de nuestro canal de atención de <strong>WhatsApp</strong>, podemos recopilar
            los siguientes datos personales con el único fin de gestionar tu proceso de información
            y admisión académica:
          </Paragraph>
          <ul className="list-disc list-inside text-gray-700 space-y-1 mb-4 ml-2">
            <li><strong>Nombre completo</strong> (proporcionado voluntariamente o extraído del perfil de WhatsApp).</li>
            <li><strong>Número de teléfono</strong> (capturado automáticamente al contactarnos).</li>
            <li><strong>Carrera o programa de interés</strong> (indicado durante la conversación).</li>
            <li><strong>Historial de conversación</strong> con nuestros asesores académicos.</li>
          </ul>

          <SubTitle>3. Finalidad del tratamiento</SubTitle>
          <Paragraph>
            Los datos recopilados se utilizan exclusivamente para:
          </Paragraph>
          <ul className="list-disc list-inside text-gray-700 space-y-1 mb-4 ml-2">
            <li>Brindarte información sobre nuestra oferta académica y procesos de admisión.</li>
            <li>Dar seguimiento a tu proceso de inscripción.</li>
            <li>Gestionar internamente el expediente de prospecto dentro de nuestro CRM institucional.</li>
            <li>Enviarte comunicaciones relacionadas con tu interés académico cuando hayas dado tu consentimiento.</li>
          </ul>

          <SubTitle>4. Protección y confidencialidad</SubTitle>
          <Paragraph>
            Tus datos están almacenados en servidores seguros con cifrado en tránsito y en reposo.
            <strong> El CUOM no vende, arrienda ni comparte tus datos personales con terceros</strong> con
            fines comerciales o publicitarios. El acceso a tu información está restringido únicamente
            al personal académico y administrativo autorizado.
          </Paragraph>

          <SubTitle>5. Tus derechos (ARCO)</SubTitle>
          <Paragraph>
            Tienes derecho a <strong>Acceder, Rectificar, Cancelar u Oponerte</strong> al tratamiento
            de tus datos personales en cualquier momento. Para ejercer estos derechos, contáctanos en{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-green-700 underline hover:text-green-600">{CONTACT_EMAIL}</a>.
          </Paragraph>

          <SubTitle>6. Contacto de privacidad</SubTitle>
          <div className="mt-2 p-4 rounded-xl bg-green-50 border border-green-100 flex items-start gap-3">
            <span className="text-xl">📧</span>
            <div>
              <p className="text-sm font-semibold text-gray-800">Correo de privacidad</p>
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-green-700 font-bold hover:underline">
                {CONTACT_EMAIL}
              </a>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════
            SECCIÓN 2 — TÉRMINOS DE SERVICIO
        ════════════════════════════════════════════════════════════════ */}
        <section id="terminos" className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 mb-6 scroll-mt-20">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">📋</span>
            <SectionTitle>Términos de Servicio</SectionTitle>
          </div>

          <SubTitle>1. Aceptación de los términos</SubTitle>
          <Paragraph>
            Al iniciar una conversación con el canal de WhatsApp del <strong>{ORG_NAME}</strong>,
            aceptas los presentes Términos de Servicio. Si no estás de acuerdo, puedes
            abstenerte de usar este canal de comunicación.
          </Paragraph>

          <SubTitle>2. Propósito del canal</SubTitle>
          <Paragraph>
            El canal de WhatsApp del CUOM es un medio de <strong>atención académica</strong> destinado
            exclusivamente a:
          </Paragraph>
          <ul className="list-disc list-inside text-gray-700 space-y-1 mb-4 ml-2">
            <li>Proporcionar información sobre programas educativos y requisitos de admisión.</li>
            <li>Dar seguimiento personalizado a prospectos interesados en nuestra oferta académica.</li>
            <li>Resolver dudas relacionadas con procesos administrativos o de inscripción.</li>
          </ul>

          <SubTitle>3. Uso aceptable</SubTitle>
          <Paragraph>
            El usuario se compromete a:
          </Paragraph>
          <ul className="list-disc list-inside text-gray-700 space-y-1 mb-4 ml-2">
            <li><strong>Proveer información veraz</strong> sobre su identidad, datos de contacto e intereses académicos.</li>
            <li>Utilizar el canal de forma respetuosa y cordial con el equipo de asesores.</li>
            <li>No enviar mensajes de spam, publicidad, contenido ofensivo o mensajes masivos no solicitados.</li>
          </ul>

          <SubTitle>4. Restricciones y bloqueos</SubTitle>
          <Paragraph>
            El <strong>{ORG_NAME}</strong> se reserva el derecho de <strong>bloquear o deshabilitar</strong> el
            acceso al canal de WhatsApp a cualquier número que incurra en las siguientes conductas:
          </Paragraph>
          <ul className="list-disc list-inside text-gray-700 space-y-1 mb-4 ml-2">
            <li>Envío de spam o mensajes repetitivos sin propósito académico.</li>
            <li>Uso de lenguaje inapropiado, amenazante u ofensivo.</li>
            <li>Suplantación de identidad o información falsa deliberada.</li>
            <li>Intentos de saturar o dañar el sistema de atención.</li>
          </ul>

          <SubTitle>5. Modificaciones</SubTitle>
          <Paragraph>
            El CUOM puede modificar estos Términos en cualquier momento. Los cambios serán
            notificados mediante el canal oficial y/o publicados en esta página con la fecha
            de actualización correspondiente.
          </Paragraph>
        </section>

        {/* ════════════════════════════════════════════════════════════════
            SECCIÓN 3 — ELIMINACIÓN DE DATOS
        ════════════════════════════════════════════════════════════════ */}
        <section id="eliminacion" className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 scroll-mt-20">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🗑️</span>
            <SectionTitle>Instrucciones para la Eliminación de Datos</SectionTitle>
          </div>

          <Paragraph>
            De conformidad con la normativa de protección de datos y los lineamientos de la
            <strong> API de WhatsApp Cloud de Meta</strong>, tienes derecho a solicitar la eliminación
            completa de tu número de teléfono, historial de conversación y cualquier dato personal
            almacenado en nuestros sistemas.
          </Paragraph>

          {/* Método 1: Correo electrónico */}
          <div className="mt-6 rounded-2xl border-2 border-green-200 bg-green-50 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-black text-sm">
                1
              </div>
              <h3 className="text-base font-bold text-gray-900">Solicitud por correo electrónico</h3>
            </div>
            <Paragraph>
              Envía un correo electrónico a{' '}
              <a href={`mailto:${CONTACT_EMAIL}?subject=Solicitud de Eliminación de Datos`} className="text-green-700 font-bold underline hover:text-green-600">
                {CONTACT_EMAIL}
              </a>{' '}
              con la siguiente información:
            </Paragraph>
            <div className="mt-2 p-4 bg-white border border-green-200 rounded-xl space-y-1 font-mono text-sm text-gray-700">
              <p><strong>Asunto:</strong> Solicitud de Eliminación de Datos</p>
              <p><strong>Cuerpo:</strong> "Solicito la eliminación de mis datos personales."</p>
              <p><strong>Incluir:</strong> Tu número de teléfono de WhatsApp (con lada).</p>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              ⏱ Tiempo de respuesta: máximo <strong>5 días hábiles</strong>.
            </p>
          </div>

          {/* Método 2: WhatsApp */}
          <div className="mt-4 rounded-2xl border-2 border-blue-200 bg-blue-50 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-sm">
                2
              </div>
              <h3 className="text-base font-bold text-gray-900">Solicitud directa por WhatsApp</h3>
            </div>
            <Paragraph>
              Desde el mismo número cuya información deseas eliminar, envía el siguiente mensaje
              a nuestro canal oficial de WhatsApp:
            </Paragraph>
            <div className="mt-2 p-4 bg-white border border-blue-200 rounded-xl font-mono text-sm text-gray-700 text-center">
              "Deseo eliminar mis datos de su sistema"
            </div>
            <p className="text-xs text-gray-500 mt-3">
              ⏱ Nuestro equipo procesará tu solicitud y confirmará la eliminación en un plazo máximo
              de <strong>5 días hábiles</strong>.
            </p>
          </div>

          <SubTitle>¿Qué datos se eliminan?</SubTitle>
          <ul className="list-disc list-inside text-gray-700 space-y-1 mb-4 ml-2">
            <li>Tu número de teléfono y nombre registrado en nuestro CRM.</li>
            <li>El historial completo de conversaciones de WhatsApp vinculado a tu número.</li>
            <li>Notas de seguimiento e información académica capturada durante la atención.</li>
          </ul>

          <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
            <span className="text-xl flex-shrink-0">⚠️</span>
            <p className="text-sm text-amber-800 leading-relaxed">
              <strong>Nota importante:</strong> Una vez eliminados, tus datos no podrán ser recuperados.
              Si en el futuro deseas retomar tu proceso de admisión, deberás iniciar un nuevo contacto
              con nuestra institución.
            </p>
          </div>
        </section>

      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500 text-center sm:text-left">
            © {new Date().getFullYear()} {ORG_NAME}. Todos los derechos reservados.
          </p>
          <div className="flex gap-4 text-xs">
            <a href="#privacidad" className="text-green-700 hover:underline">Privacidad</a>
            <a href="#terminos" className="text-green-700 hover:underline">Términos</a>
            <a href="#eliminacion" className="text-green-700 hover:underline">Eliminación</a>
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-green-700 hover:underline">Contacto</a>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default LegalPolicies;
