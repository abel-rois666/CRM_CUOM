-- Migración para agregar el estado de inscripción (documentación y pagos) a la tabla leads
ALTER TABLE leads
ADD COLUMN enrollment_status JSONB DEFAULT '{
    "pago": "Pendiente",
    "documentacion_inscripcion": "Pendiente",
    "acta_nacimiento": "Pendiente",
    "certificado_bachillerato": "Pendiente",
    "fotografias": "Pendiente"
}'::jsonb;
