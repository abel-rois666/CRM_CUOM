import { z } from 'zod';

// Patrón para nombres genéricos: Lead-1, Lead-42, etc.
const GENERIC_NAME_PATTERN = /^Lead-\d+$/;
// Patrón para apellido genérico
const GENERIC_LASTNAME_PATTERN = /^Sin Identificar$/;

// Validación de nombre: acepta letras normales O el formato genérico Lead-N
const firstNameSchema = z
    .string()
    .min(2, { message: "El nombre debe tener al menos 2 caracteres" })
    .max(50, { message: "El nombre no puede exceder 50 caracteres" })
    .refine(
        (val) =>
            /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(val) || GENERIC_NAME_PATTERN.test(val),
        { message: "El nombre solo puede contener letras o ser un nombre genérico (Lead-N)" }
    );

// Validación de apellido paterno: acepta letras normales O "Sin Identificar"
const paternalLastNameSchema = z
    .string()
    .min(2, { message: "El apellido debe tener al menos 2 caracteres" })
    .max(50, { message: "El apellido no puede exceder 50 caracteres" })
    .refine(
        (val) =>
            /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(val) || GENERIC_LASTNAME_PATTERN.test(val),
        { message: "El apellido solo puede contener letras" }
    );

export const leadSchema = z.object({
    first_name: firstNameSchema,

    paternal_last_name: paternalLastNameSchema,

    maternal_last_name: z
        .string()
        .max(50, { message: "El apellido no puede exceder 50 caracteres" })
        .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/, { message: "El apellido solo puede contener letras" })
        .optional()
        .or(z.literal('')), // Permitir string vacío

    email: z
        .string()
        .email({ message: "Formato de correo inválido" })
        .optional()
        .or(z.literal('')),

    phone: z
        .string()
        .min(7, { message: "El teléfono debe tener al menos 7 dígitos" })
        .max(15, { message: "El teléfono no puede exceder 15 dígitos" })
        .regex(/^\d+$/, { message: "Solo se permiten números" }),

    program_id: z.string().min(1, { message: "Debes seleccionar una licenciatura" }),
    advisor_id: z.string().min(1, { message: "Debes asignar un asesor" }),
    status_id: z.string().min(1, { message: "Debes seleccionar un estatus" }),
    source_id: z.string().min(1, { message: "Debes seleccionar un origen" }),
    turno_id: z.string().optional().or(z.literal('')),
});

export type LeadFormData = z.infer<typeof leadSchema>;
