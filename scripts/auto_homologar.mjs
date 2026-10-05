import fs from 'fs';

// ==========================================
// SCRIPT DE HOMOLOGACIÓN SIN CLAVES (OFFLINE)
// ==========================================

function normalize(str) {
    if (!str) return '';
    return str.normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ');
}

function runHomologation() {
    console.log("Iniciando análisis de homologación desde archivos JSON locales...\n");

    let crmData = [];
    let escolarData = [];

    // 1. Leer los archivos JSON
    try {
        const crmFile = fs.readFileSync('crm_carreras.json', 'utf8');
        crmData = JSON.parse(crmFile);
    } catch (e) {
        console.error("❌ ERROR: No se encontró o no se pudo leer el archivo 'crm_carreras.json'.");
        console.log("Instrucciones: Ejecuta en el SQL Editor del CRM: SELECT json_agg(json_build_object('id', id, 'name', name)) FROM licenciaturas; y guarda el resultado en ese archivo.");
        return;
    }

    try {
        const escolarFile = fs.readFileSync('escolar_carreras.json', 'utf8');
        escolarData = JSON.parse(escolarFile);
    } catch (e) {
        console.error("❌ ERROR: No se encontró o no se pudo leer el archivo 'escolar_carreras.json'.");
        console.log("Instrucciones: Ejecuta en el SQL Editor de Escolar: SELECT json_agg(json_build_object('id', id, 'nombre', nombre)) FROM carreras; y guarda el resultado en ese archivo.");
        return;
    }

    console.log(`✅ Se encontraron ${crmData.length} licenciaturas en el CRM.`);
    console.log(`✅ Se encontraron ${escolarData.length} carreras en Control Escolar.\n`);

    // 2. Realizar el emparejamiento (matching)
    const matched = [];
    const unmatched = [];

    for (const crmItem of crmData) {
        const crmNorm = normalize(crmItem.name);
        
        // Buscar coincidencia exacta (normalizada)
        const match = escolarData.find(escItem => normalize(escItem.nombre) === crmNorm);
        
        // Si no hay exacta, buscar por similitud
        let bestMatch = match;
        if (!bestMatch) {
            bestMatch = escolarData.find(escItem => {
                const escNorm = normalize(escItem.nombre);
                return escNorm.includes(crmNorm) || crmNorm.includes(escNorm);
            });
        }

        if (bestMatch) {
            matched.push({
                crm_program_id: crmItem.id,
                crm_name: crmItem.name,
                escolar_carrera_id: bestMatch.id,
                escolar_licenciatura_nombre: bestMatch.nombre
            });
        } else {
            unmatched.push(crmItem.name);
        }
    }

    // 3. Generación del reporte
    console.log("=============================================");
    console.log(`🎯 RESULTADOS DEL MATCHING (${matched.length} emparejadas, ${unmatched.length} sin emparejar)`);
    console.log("=============================================\n");

    if (unmatched.length > 0) {
        console.log("❌ LICENCIATURAS DEL CRM SIN PAREJA EN CONTROL ESCOLAR:");
        unmatched.forEach(name => console.log(`  - ${name}`));
        console.log("\n");
    }

    if (matched.length > 0) {
        console.log("✅ COPIA Y PEGA ESTE SCRIPT EN EL SQL EDITOR DE TU CRM:");
        console.log("------------------------------------------------------------------------------------------------");
        console.log("INSERT INTO public.homologacion_programas (crm_program_id, escolar_carrera_id, escolar_licenciatura_nombre)");
        console.log("VALUES");
        
        const values = matched.map((m, i) => {
            const isLast = i === matched.length - 1;
            const safeName = m.escolar_licenciatura_nombre.replace(/'/g, "''");
            return `    ('${m.crm_program_id}', '${m.escolar_carrera_id}', '${safeName}')${isLast ? '' : ','} -- CRM: ${m.crm_name}`;
        });
        
        console.log(values.join("\n"));
        console.log("ON CONFLICT (crm_program_id) DO UPDATE SET");
        console.log("escolar_carrera_id = EXCLUDED.escolar_carrera_id,");
        console.log("escolar_licenciatura_nombre = EXCLUDED.escolar_licenciatura_nombre;");
        console.log("------------------------------------------------------------------------------------------------\n");
    }
}

runHomologation();
