import { getSupabaseServerClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

const _mapa = { "regiones": [{ "numero": 15, "romano": "XV", "nombre": "Arica y Parinacota", "capital": "Arica", "comunas": ["Arica", "Camarones", "General Lagos", "Putre"] }, { "numero": 1, "romano": "I", "nombre": "Tarapacá", "capital": "Iquique", "comunas": ["Alto Hospicio", "Camiña", "Colchane", "Huara", "Iquique", "Pica", "Pozo Almonte"] }, { "numero": 2, "romano": "II", "nombre": "Antofagasta", "capital": "Antofagasta", "comunas": ["Antofagasta", "Calama", "María Elena", "Mejillones", "Ollagüe", "San Pedro de Atacama", "Sierra Gorda", "Taltal", "Tocopilla"] }, { "numero": 3, "romano": "III", "nombre": "Atacama", "capital": "Copiapó", "comunas": ["Alto del Carmen", "Caldera", "Chañaral", "Copiapó", "Diego de Almagro", "Freirina", "Huasco", "Tierra Amarilla", "Vallenar"] }, { "numero": 4, "romano": "IV", "nombre": "Coquimbo", "capital": "La Serena", "comunas": ["Andacollo", "Canela", "Combarbalá", "Coquimbo", "Illapel", "La Higuera", "La Serena", "Los Vilos", "Monte Patria", "Ovalle", "Paiguano", "Punitaqui", "Río Hurtado", "Salamanca", "Vicuña"] }, { "numero": 5, "romano": "V", "nombre": "Valparaíso", "capital": "Valparaíso", "comunas": ["Algarrobo", "Cabildo", "Calera", "Calle Larga", "Cartagena", "Casablanca", "Catemu", "Concón", "El Quisco", "El Tabo", "Hijuelas", "Isla de Pascua", "Juan Fernández", "La Cruz", "La Ligua", "Limache", "Llaillay", "Los Andes", "Nogales", "Olmué", "Panquehue", "Papudo", "Petorca", "Puchuncaví", "Putaendo", "Quillota", "Quilpué", "Quintero", "Rinconada", "San Antonio", "San Esteban", "San Felipe", "Santa María", "Santo Domingo", "Valparaíso", "Villa Alemana", "Viña del Mar", "Zapallar"] }, { "numero": 13, "romano": "RM", "nombre": "Metropolitana de Santiago", "capital": "Santiago", "comunas": ["Alhué", "Buin", "Calera de Tango", "Cerrillos", "Cerro Navia", "Colina", "Conchalí", "Curacaví", "El Bosque", "El Monte", "Estación Central", "Huechuraba", "Independencia", "Isla de Maipo", "La Cisterna", "La Florida", "La Granja", "La Pintana", "La Reina", "Lampa", "Las Condes", "Lo Barnechea", "Lo Espejo", "Lo Prado", "Macul", "Maipú", "María Pinto", "Melipilla", "Ñuñoa", "Padre Hurtado", "Paine", "Pedro Aguirre Cerda", "Peñaflor", "Peñalolén", "Pirque", "Providencia", "Pudahuel", "Puente Alto", "Quilicura", "Quinta Normal", "Recoleta", "Renca", "San Bernardo", "San Joaquín", "San José de Maipo", "San Miguel", "San Pedro", "San Ramón", "Santiago", "Talagante", "Tiltil", "Vitacura"] }, { "numero": 6, "romano": "VI", "nombre": "Libertador General Bernardo O'Higgins", "capital": "Rancagua", "comunas": ["Chépica", "Chimbarongo", "Codegua", "Coínco", "Coltauco", "Doñihue", "Graneros", "La Estrella", "Las Cabras", "Litueche", "Lolol", "Machalí", "Malloa", "Marchihue", "Mostazal", "Nancagua", "Navidad", "Olivar", "Palmilla", "Paredones", "Peralillo", "Peumo", "Pichidegua", "Pichilemu", "Placilla", "Pumanque", "Quinta de Tilcoco", "Rancagua", "Rengo", "Requínoa", "San Fernando", "San Vicente", "Santa Cruz"] }, { "numero": 7, "romano": "VII", "nombre": "Maule", "capital": "Talca", "comunas": ["Cauquenes", "Chanco", "Colbún", "Constitución", "Curepto", "Curicó", "Empedrado", "Hualañé", "Licantén", "Linares", "Longaví", "Maule", "Molina", "Parral", "Pelarco", "Pelluhue", "Pencahue", "Rauco", "Retiro", "Río Claro", "Romeral", "Sagrada Familia", "San Clemente", "San Javier", "San Rafael", "Talca", "Teno", "Vichuquén", "Villa Alegre", "Yerbas Buenas"] }, { "numero": 16, "romano": "XVI", "nombre": "Ñuble", "capital": "Chillán", "comunas": ["Bulnes", "Chillán", "Chillán Viejo", "Cobquecura", "Coelemu", "Coihueco", "El Carmen", "Ninhue", "Ñiquén", "Pemuco", "Pinto", "Portezuelo", "Quillón", "Quirihue", "Ránquil", "San Carlos", "San Fabián", "San Ignacio", "San Nicolás", "Treguaco", "Yungay"] }, { "numero": 8, "romano": "VIII", "nombre": "Biobío", "capital": "Concepción", "comunas": ["Alto Biobío", "Antuco", "Arauco", "Cabrero", "Cañete", "Chiguayante", "Concepción", "Contulmo", "Coronel", "Curanilahue", "Florida", "Hualpén", "Hualqui", "Laja", "Lebu", "Los Álamos", "Los Ángeles", "Lota", "Mulchén", "Nacimiento", "Negrete", "Penco", "Quilaco", "Quilleco", "San Pedro de la Paz", "San Rosendo", "Santa Bárbara", "Santa Juana", "Talcahuano", "Tirúa", "Tomé", "Tucapel", "Yumbel"] }, { "numero": 9, "romano": "IX", "nombre": "La Araucanía", "capital": "Temuco", "comunas": ["Angol", "Carahue", "Cholchol", "Collipulli", "Cunco", "Curacautín", "Curarrehue", "Ercilla", "Freire", "Galvarino", "Gorbea", "Lautaro", "Loncoche", "Lonquimay", "Los Sauces", "Lumaco", "Melipeuco", "Nueva Imperial", "Padre Las Casas", "Perquenco", "Pitrufquén", "Pucón", "Purén", "Renaico", "Saavedra", "Temuco", "Teodoro Schmidt", "Toltén", "Traiguén", "Victoria", "Vilcún", "Villarrica"] }, { "numero": 14, "romano": "XIV", "nombre": "Los Ríos", "capital": "Valdivia", "comunas": ["Corral", "Futrono", "La Unión", "Lago Ranco", "Lanco", "Los Lagos", "Máfil", "Mariquina", "Paillaco", "Panguipulli", "Río Bueno", "Valdivia"] }, { "numero": 10, "romano": "X", "nombre": "Los Lagos", "capital": "Puerto Montt", "comunas": ["Ancud", "Calbuco", "Castro", "Chaitén", "Chonchi", "Cochamó", "Curaco de Vélez", "Dalcahue", "Fresia", "Frutillar", "Futaleufú", "Hualaihué", "Llanquihue", "Los Muermos", "Maullín", "Osorno", "Palena", "Puerto Montt", "Puerto Octay", "Puerto Varas", "Puqueldón", "Purranque", "Puyehue", "Queilén", "Quellón", "Quemchi", "Quinchao", "Río Negro", "San Juan de la Costa", "San Pablo"] }, { "numero": 11, "romano": "XI", "nombre": "Aysén del General Carlos Ibáñez del Campo", "capital": "Coyhaique", "comunas": ["Aysén", "Chile Chico", "Cisnes", "Cochrane", "Coyhaique", "Guaitecas", "Lago Verde", "O'Higgins", "Río Ibáñez", "Tortel"] }, { "numero": 12, "romano": "XII", "nombre": "Magallanes y de la Antártica Chilena", "capital": "Punta Arenas", "comunas": ["Antártica", "Cabo de Hornos", "Laguna Blanca", "Natales", "Porvenir", "Primavera", "Punta Arenas", "Río Verde", "San Gregorio", "Timaukel", "Torres del Paine"] }], "totalComunas": 346 }

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (query === "repararDirecciones") {
        const result = await repararDirecciones();
        return NextResponse.json({ ok: true, result });
    }

    if (query === "resetVentas") {
        const result = await resetVentas();
        return NextResponse.json({ ok: true, result });
    }

    if (query === "agregarComunas") {
        const result = await agregarComunas();
        return NextResponse.json({ ok: true, result });
    }

    return NextResponse.json({ ok: false, error: "Invalid query parameter" }, { status: 400 });
}

const resetVentas = async () => {
    const supabase = await getSupabaseServerClient();
    const summary = {
        deleted: {},
        skippedMissingTables: [],
        warnings: []
    };

    const isMissingRelationError = (error) => {
        const msg = String(error?.message || "").toLowerCase();
        return error?.code === "42P01" || msg.includes("relation") && msg.includes("does not exist");
    };

    const registerDeletedCount = (tableName, count) => {
        summary.deleted[tableName] = (summary.deleted[tableName] || 0) + (count || 0);
    };

    const deleteAllRows = async (tableName, idColumn = "id") => {
        const { error, count } = await supabase
            .from(tableName)
            .delete({ count: "exact" })
            .not(idColumn, "is", null);

        if (error) {
            if (isMissingRelationError(error)) {
                summary.skippedMissingTables.push(tableName);
                return { ok: false, missing: true };
            }
            throw new Error(`[resetVentas] Error deleting from ${tableName}: ${error.message}`);
        }

        registerDeletedCount(tableName, count);
        return { ok: true, tableName, count: count || 0 };
    };

    const tryNullifyBiDeudasUltimaVenta = async () => {
        const { error } = await supabase
            .from("bi_deudas")
            .update({ ultima_venta_id: null })
            .not("ultima_venta_id", "is", null);

        if (!error) return;

        if (isMissingRelationError(error) || error.code === "42703") {
            summary.warnings.push("No existe bi_deudas.ultima_venta_id en este entorno. Se omite nullify.");
            return;
        }

        throw new Error(`[resetVentas] Error limpiando bi_deudas.ultima_venta_id: ${error.message}`);
    };

    try {
        // 1) Limpiar tablas hijas de detalle de venta e historial de ventas.
        await deleteAllRows("detalle_venta_items");
        await deleteAllRows("detalle_ventas");
        await deleteAllRows("venta_historial_estados");

        // También limpiar entregas locales vinculadas a ventas.
        await deleteAllRows("venta_entregas_local");

        // También limpiar comentarios de cobro si existen en la tabla actual.
        await deleteAllRows("venta_comentarios_cobro");

        // Limpiar dependencias que referencian ventas sin ON DELETE CASCADE.
        await deleteAllRows("pagos");
        await deleteAllRows("registro_comisiones");
        await tryNullifyBiDeudasUltimaVenta();

        // 2) Limpiar relaciones e historial de rutas.
        await deleteAllRows("ruta_despacho_historial_carga_items_movidos");
        await deleteAllRows("ruta_despacho_historial_carga");
        await deleteAllRows("ruta_despacho_historial_estados");
        await deleteAllRows("ruta_despacho_destinos");
        await deleteAllRows("ruta_despacho_ventas");

        // 3) Eliminar ventas.
        const ventasEliminadasResult = await deleteAllRows("ventas");
        const ventasEliminadas = ventasEliminadasResult.count || 0;

        // 4) Finalmente borrar rutas de despacho.
        try {
            await deleteAllRows("rutas_despacho");
        } catch (error) {
            const isFkError = error?.message?.includes("23503") || error?.message?.toLowerCase?.().includes("foreign key");
            if (!isFkError) {
                throw error;
            }

            // Reintentar una vez más tras limpiar relaciones de ruta.
            await deleteAllRows("ruta_despacho_ventas");
            await deleteAllRows("rutas_despacho");
        }

        await deleteAllRows("ventas");

        return {
            message: "Reset completo de ventas y rutas finalizado.",
            ventasEliminadas,
            ...summary
        };
    } catch (error) {
        console.error("[resetVentas] Error:", error);
        throw error;
    }
}

const repararDirecciones = async () => {
    try {
        const supabase = await getSupabaseServerClient();
        const BATCH_SIZE = 1000;

        // Get total addresses to process.
        const { count: totalDirecciones, error: totalError } = await supabase
            .from("direcciones")
            .select("id", { count: "exact", head: true });

        if (totalError) throw totalError;

        const total = totalDirecciones || 0;

        // Fetch all communes for lookup
        const { data: comunas, error: comunasError } = await supabase
            .from("comunas")
            .select("id, nombre, region_id");

        if (comunasError) throw comunasError;

        // Create a map for faster commune lookup
        const comunaMap = new Map(
            comunas.map(c => [c.nombre.toLowerCase(), c.id])
        );

        let processed = 0;
        let skipped = 0;

        for (let offset = 0; offset < total; offset += BATCH_SIZE) {
            const end = Math.min(offset + BATCH_SIZE - 1, total - 1);

            // Select a safe chunk to avoid Supabase row limits.
            const { data: direcciones, error: fetchError } = await supabase
                .from("direcciones")
                .select("id, direccion_cliente")
                .order("id", { ascending: true })
                .range(offset, end);

            if (fetchError) throw fetchError;

            if (!direcciones || direcciones.length === 0) {
                continue;
            }

            // Process each address in current chunk.
            for (const dir of direcciones) {
                if ((!dir?.direccion_cliente || typeof dir.direccion_cliente !== "string") && dir?.comuna_id !== null) {
                    skipped++;
                    continue;
                }

                const [calle, comunaName] = dir.direccion_cliente.split(",");
                const comunaNormalized = comunaName?.trim().toLowerCase();

                const comunaId = comunaMap.get(comunaNormalized);

                if (!comunaId || !calle?.trim()) {
                    console.log("Skipped ", skipped, "--> comunaId", comunaId, "calle", calle.trim());
                    skipped++;
                    continue;
                }

                // Update address with commune_id and cleaned street.
                const { error: updateError } = await supabase
                    .from("direcciones")
                    .update({
                        comuna_id: comunaId,
                        direccion_cliente: calle.trim()
                    })
                    .eq("id", dir.id);

                if (updateError) {
                    console.warn(`Error updating address ${dir.id}:`, updateError);
                } else {
                    processed++;
                }
            }
        }

        return { processed, skipped, total };
    } catch (error) {
        console.error("[repararDirecciones] Error:", error);
        throw error;
    }
}

const agregarComunas = async () => {
    let insertadas = 0;
    let omitidas = 0;
    const supabase = await getSupabaseServerClient();    

    for (const region of _mapa.regiones) {
      for (const comunaNombre of region.comunas) {
        //
        // Verificar existencia previa
        //

        const { data: existente, error: existeError } =
          await supabase
            .from("comunas")
            .select("id")
            .eq("nombre", comunaNombre)
            .eq("region_id", region.numero)
            .maybeSingle();

        if (existeError) {
          console.error(
            `Error verificando comuna ${comunaNombre}:`,
            existeError
          );

          continue;
        }

        //
        // Si ya existe → omitir
        //

        if (existente) {
          omitidas++;
          continue;
        }

        //
        // Insertar comuna
        //

        console.log(comunaNombre, ",", region.numero);
            continue;

        const { error: insertError } =
          await supabase
            .from("comunas")
            .insert({
              nombre: comunaNombre,
              region_id: region.numero,
            });

        if (insertError) {
          console.error(
            `Error insertando comuna ${comunaNombre}:`,
            insertError
          );

          continue;
        }

        insertadas++;
      }
    }

    return NextResponse.json({
      ok: true,
      insertadas,
      omitidas,
    });
}