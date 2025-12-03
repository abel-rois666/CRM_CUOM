# 🎓 CRM Universitario - Sistema de Gestión de Leads

Sistema integral de gestión de relaciones con clientes (CRM) diseñado específicamente para instituciones educativas. Permite administrar el ciclo de vida de los aspirantes (leads), desde el primer contacto hasta la inscripción, optimizando el seguimiento y la asignación de asesores.

## 🚀 Características Principales

### 📊 Dashboard y Métricas
- **KPIs en tiempo real:** Visualización de leads nuevos, citas del día y tareas pendientes.
- **Gráficas Interactivas:** Distribución de leads por estado y carga de trabajo por asesor.
- **Filtros Rápidos:** Accesos directos a leads sin seguimiento o con citas urgentes.

### 👥 Gestión de Leads
- **Vistas Múltiples:** Alterna entre vista de **Lista** (tabla detallada) y **Tablero Kanban** (arrastrar y soltar).
- **Expediente Digital:** Ficha detallada del aspirante con pestañas de *Información*, *Historial/Bitácora* y *Agenda*.
- **Bitácora de Seguimiento:** Registro cronológico de notas, llamadas, cambios de estado y citas.
- **Alertas de Duplicados:** Detección automática de citas empalmadas.

### 📅 Agenda y Comunicación
- **Gestión de Citas:** Programación, reprogramación y cancelación con integración de enlaces a Google Calendar.
- **Plantillas Inteligentes:** Mensajes predefinidos para WhatsApp y Correo Electrónico, gestionables por el equipo.
- **Accesos Directos:** Botones para iniciar chat de WhatsApp o redactar correos directamente desde la plataforma.

### 🛡️ Seguridad y Roles (RBAC)
El sistema implementa **Row Level Security (RLS)** en base de datos para garantizar la privacidad:
- **Administrador:** Control total, gestión de usuarios, catálogos, eliminación de registros y exportación de datos.
- **Coordinador (Moderador):** Supervisión global, reasignación de leads y gestión de plantillas.
- **Asesor:** Acceso exclusivo a sus leads asignados y herramientas de seguimiento.

### 🛠️ Herramientas Adicionales
- **Importación Masiva:** Carga de leads desde archivos CSV con mapeo de columnas.
- **Reportes PDF:** Generación de informes ejecutivos listos para imprimir.
- **Auditoría:** Registro automático de quién creó o modificó cada nota y cita (`created_by`, `updated_at`).

## 💻 Stack Tecnológico

- **Frontend:** React 19, TypeScript, Vite.
- **Estilos:** Tailwind CSS (Diseño Responsivo y Moderno).
- **Backend / Base de Datos:** Supabase (PostgreSQL, Auth, Realtime).
- **Componentes Clave:**
  - `recharts`: Visualización de datos.
  - `@hello-pangea/dnd`: Funcionalidad Drag & Drop.
  - `jspdf` & `html2canvas`: Exportación de reportes.

## ⚙️ Instalación y Configuración

### Prerrequisitos
- Node.js (v18 o superior)
- Cuenta en [Supabase](https://supabase.com/)

### Pasos

1.  **Clonar el repositorio:**
    ```bash
    git clone [https://github.com/tu-usuario/crm-universitario.git](https://github.com/tu-usuario/crm-universitario.git)
    cd crm-universitario
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    ```

3.  **Configurar Variables de Entorno:**
    Crea un archivo `.env` en la raíz del proyecto y agrega tus credenciales de Supabase:
    ```env
    VITE_SUPABASE_URL=tu_supabase_url
    VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
    ```

4.  **Configurar Base de Datos:**
    Ejecuta los scripts SQL proporcionados en la documentación interna para:
    - Crear tablas (`leads`, `profiles`, `appointments`, etc.).
    - Configurar las políticas de seguridad (RLS).
    - Establecer los triggers de auditoría.

5.  **Ejecutar en Desarrollo:**
    ```bash
    npm run dev
    ```

## 🔐 Estructura de Base de Datos (Resumen)

El sistema se basa en las siguientes tablas principales en Supabase:

- `profiles`: Extensión de la tabla de usuarios con roles (`admin`, `moderator`, `advisor`).
- `leads`: Información central de los aspirantes.
- `appointments`: Citas programadas vinculadas a leads y asesores.
- `follow_ups`: Notas de seguimiento y bitácora.
- `status_history`: Historial de cambios de estado para auditoría.
- `statuses`, `sources`, `licenciaturas`: Catálogos configurables.

## 🤝 Contribución

Este es un proyecto privado para uso institucional. Las contribuciones deben seguir el flujo de trabajo establecido (Pull Requests y revisión de código).

---
© 2025 CRM Universitario. Todos los derechos reservados.
