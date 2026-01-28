import { NextResponse } from "next/server";
import { migrateAuthEndpoint } from "@/lib/auth/apiMigrationHelper";
import { supabase } from "@/lib/supabase";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { TIPO_CHECKLIST, TIPO_CHECKLIST_ITEM } from "@/app/utils/constants";
// DB access migrated to Supabase; Vehiculo model no longer used

export const POST = migrateAuthEndpoint(async ({ user }, req) => {
    try {
        console.log("Generating checklist report v0.92 (Supabase)");

        const body = await req.json();

        console.log("************ Request body:", body);

        const {
            kilometraje = "-",
            vehiculoId,
            tipo
        } = body;

        // Ítems que usan selector especial (mal/regular/bien)
        const specialSelectorItems = [
            "cintas_reflectantes",
            "cinturon_conductor",
            "estado_pedal_freno",
            "neumaticos_delanteros",
            "freno_mano",
        ];

        // Ítems de limpieza
        const limpiezaItems = [
            "limpieza_cabina",
            "limpieza_exterior",
        ];

        // Opciones para los selectores
        const selectorOptions = [
            { value: 1, label: "Mal" },
            { value: 2, label: "Regular" },
            { value: 3, label: "Bien" }
        ];
        const limpiezaOptions = [
            { value: 0, label: "Sucio" },
            { value: 1, label: "Limpio" }
        ];

        let vehiculoData = null;
        if (tipo === TIPO_CHECKLIST.vehiculo && vehiculoId) {
            const { data: vehiculo, error } = await supabase
                .from('vehiculos')
                .select('id, marca, modelo, patente')
                .eq('id', vehiculoId)
                .single();
            if (!error && vehiculo) vehiculoData = vehiculo;
        }

        // Etiquetas para los ítems
        const labels = {
            tarjeta_combustible: "Tarjeta de combustible",
            hoja_seguridad_transporte: "Hoja de seguridad de transporte",
            permiso_circulacion: "Permiso de circulación",
            seguro_obligatorio: "Seguro obligatorio",
            botiquien: "Botiquín",
            limpieza_cabina: "Limpieza de cabina",
            bocina: "Bocina",
            cinturon_conductor: "Cinturón conductor",
            estado_pedal_freno: "Estado pedal freno",
            luz_emergencia: "Luz de emergencia",
            luz_bocina_retroceso: "Luz/bocina de retroceso",
            luz_navegacion_posicion: "Luz de navegación/posición",
            luces_altas: "Luces altas",
            luces_bajas: "Luces bajas",
            intermitentes: "Intermitentes",
            luz_patente: "Luz de patente",
            luz_freno: "Luz de freno",
            freno_mano: "Freno de mano",
            espejos_laterales: "Espejos laterales",
            cintas_reflectantes: "Cintas reflectantes",
            regulador_oxigeno_argon: "Regulador oxígeno/argón",
            neumaticos_delanteros: "Neumáticos delanteros",
            neumaticos_traseros: "Neumáticos traseros",
            neumatico_repuesto: "Neumático de repuesto",
            limpieza_exterior: "Limpieza exterior",
            conos_seguridad: "Conos de seguridad",
            zapatos_seguridad: "Zapatos de seguridad",
            polera_geologo: "Polera geólogo",
            guantes_seguridad: "Guantes de seguridad",
            bloqueador_solar: "Bloqueador solar",
            intercomunicador: "Intercomunicador",
            pantalon: "Pantalón",
            casco: "Casco",
            lentes: "Lentes",
            impresora: "Impresora"
        };

        // Determinar si un ítem es obligatorio (valor > 0)
        function getCriterioMinimo(value) {
            return value > 0 ? "Sí" : "Opcional";
        }

        // Determinar si el checklist está aprobado (todos los obligatorios respondidos correctamente)
        function resultadoChecklist(checklistItems) {
            return checklistItems.every(([key,]) => {
                const respuesta = body[key];
                return respuesta !== 0 && respuesta !== false && respuesta !== undefined && respuesta !== null;
            });
        }

        // Solo los ítems que están en TIPO_CHECKLIST_ITEM
        let checklistItems = Object.entries(TIPO_CHECKLIST_ITEM).filter(([, value]) => tipo === TIPO_CHECKLIST.vehiculo ? value < 128 : value >= 128);
        
        console.log("Checklist items:", checklistItems);

        // Función para mostrar la respuesta según el tipo de ítem
        function getRespuesta(key) {            
            const raw = body[key.toString()];
            console.log("Processing key:", key, "with raw value:", raw);

            if (specialSelectorItems.includes(key)) {
                const opt = selectorOptions.find(o => o.value === raw);
                return opt ? opt.label : "-";
            }
            if (limpiezaItems.includes(key)) {
                const opt = limpiezaOptions.find(o => o.value === raw);
                return opt ? opt.label : "-";
            }
            // Si-no (booleano)
            if (typeof raw === "boolean") {
                return raw ? "Sí" : "No";
            }
            // Si es number/string y no está vacío
            if (raw !== undefined && raw !== null && raw !== "") {
                return raw;
            }
            return "-";
        }

        // Construir las filas de la tabla
        const tableRows = checklistItems.map(([key, value]) => {
            const criterio = getCriterioMinimo(value);
            const label = labels[key] || key;
            const respuesta = getRespuesta(key);
            return [label, criterio, respuesta];
        });

        const aprobado = resultadoChecklist(checklistItems);

        const marginLeft = 16;
        const marginRight = 16;
        const marginTop = 18;
        const fontSizeTitle = 13;
        const fontSizeText = 8;
        const fontSizeTable = 8;

        const doc = new jsPDF({ format: "letter", unit: "mm" });
        doc.setFontSize(fontSizeTitle);
        doc.text(`Reporte Checklist ${tipo === TIPO_CHECKLIST.vehiculo ? "de vehículo" : "personal"}`, marginLeft, marginTop);

        doc.setFontSize(fontSizeText);
        let y = marginTop + 6;

        // Cabecera con dos columnas: Usuario y Patente (si aplica)
        let usuario = session.user?.name || session.user?.email || "-";
        let fecha = new Date().toLocaleString("es-CL");
        let patente = vehiculoData?.patente || "-";
        let marcaModelo = [vehiculoData?.marca, vehiculoData?.modelo].filter(Boolean).join(" ") || "-";

        if (tipo === TIPO_CHECKLIST.vehiculo) {
            // Dos columnas: Usuario y Patente
            doc.text(`Colaborador: ${usuario}`, marginLeft, y);
            doc.text(`Patente: ${patente}`, 110, y); // Ajusta 110 según ancho de página
            y += 5;
            doc.text(`Kilometraje: ${kilometraje}`, marginLeft, y);
            doc.text(`Marca/Modelo: ${marcaModelo}`, 110, y);
            y += 5;
        } else {
            doc.text(`Colaborador: ${usuario}`, marginLeft, y);
            y += 5;
        }
        doc.text(`Fecha: ${fecha}`, marginLeft, y);
        y += 5;

        autoTable(doc, {
            startY: y + 2,
            head: [["Ítem", "Criterio mínimo", "Respuesta"]],
            body: tableRows,
            styles: { fontSize: fontSizeTable, cellPadding: 1.2 },
            margin: { left: marginLeft, right: marginRight }
        });

        // Firma y sello
        let finalY = doc.lastAutoTable.finalY + 8;
        doc.setFontSize(fontSizeText);
        doc.text("____________________________", marginLeft, finalY);
        doc.text(`Firma: ${usuario}`, marginLeft, finalY + 4);

        doc.setFontSize(fontSizeTitle);
        if (aprobado) {
            doc.setTextColor(40, 167, 69);
            doc.textWithLink("APROBADO", 120, finalY, { url: "" });
        } else {
            doc.setTextColor(220, 53, 69);
            doc.textWithLink("RECHAZADO", 120, finalY, { url: "" });
        }
        doc.setTextColor(0, 0, 0);

        const pdfBuffer = doc.output("arraybuffer");
        return new NextResponse(Buffer.from(pdfBuffer), {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": "inline; filename=reporte_checklist.pdf"
            }
        });
    } catch (error) {
        console.error("Error generating checklist report:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
});
