/**
 * Formatea una fecha en formato DD/MM/AAAA de forma GARANTIZADA,
 * sin depender del locale del navegador ni de la configuración regional del OS.
 *
 * toLocaleDateString('es-MX') puede seguir usando MM/DD en algunos navegadores de Windows
 * porque el Intl API hereda la configuración del sistema operativo.
 * Esta función construye la cadena manualmente para evitar esa inconsistencia.
 *
 * Ejemplos:
 *   formatDate('2026-02-12T06:00:00Z')  →  "12/02/2026"
 *   formatDate(new Date())              →  "03/03/2026"
 */
export function formatDate(value: string | Date | null | undefined): string {
    if (!value) return '-';
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return '-';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

/**
 * Formatea fecha y hora en DD/MM/AAAA HH:MM (construcción manual, sin locale)
 */
export function formatDateTime(value: string | Date | null | undefined): string {
    if (!value) return '-';
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return '-';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hh}:${mm}`;
}
