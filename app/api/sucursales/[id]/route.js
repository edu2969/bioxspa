import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/supabase/supabase-auth";

export async function GET(req, props) {
    try {
        console.log(req.url);
        const params = await props.params;
        const { data: authResult } = await getAuthenticatedUser();
        
        if (!authResult || !authResult.userData) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }
        
        const supabase = await getSupabaseServerClient();
        // Obtener la sucursal con su dirección
        const { data: sucursalData, error: sucursalError } = await supabase
            .from("sucursales")
            .select(`
                id,
                nombre,
                visible,
                prioridad,
                direccion_id,
                direccion:direcciones(
                    id,
                    direccion_cliente,
                    place_id,
                    latitud,
                    longitud
                ),
                created_at,
                updated_at
            `)
            .eq("id", params.id)
            .single();

        if (sucursalError || !sucursalData) {
            console.error("Error fetching sucursal:", sucursalError);
            return NextResponse.json({ error: "Sucursal not found" }, { status: 400 });
        }

        // Obtener las dependencias con sus direcciones, clientes y cargos
        const { data: dependencias, error: dependenciasError } = await supabase
            .from("dependencias")
            .select(`
                id,
                nombre,
                tipo,
                activa,
                direccion_id,
                cliente_id,
                direccion:direcciones(
                    id,
                    direccion_cliente,
                    place_id,
                    latitud,
                    longitud
                ),
                cliente:clientes(
                    id,
                    nombre,
                    rut
                ),
                cargos:cargos(
                    id,
                    usuario_id,
                    tipo,
                    desde,
                    hasta,
                    activo,
                    created_at,
                    updated_at,
                    usuario:usuarios(
                        id,
                        nombre,
                        email
                    )
                ),
                created_at,
                updated_at
            `)
            .eq("sucursal_id", params.id);

        if (dependenciasError) {
            console.error("Error fetching dependencias:", dependenciasError);
            return NextResponse.json({ error: dependenciasError.message }, { status: 500 });
        }

        // Obtener los cargos directos de la sucursal
        const { data: cargos, error: cargosError } = await supabase
            .from("cargos")
            .select(`
                id,
                usuario_id,
                tipo,
                desde,
                hasta,
                activo,
                created_at,
                updated_at,
                usuario:usuarios(
                    id,
                    nombre,
                    email
                )
            `)
            .eq("sucursal_id", params.id);

        if (cargosError) {
            console.error("Error fetching cargos:", cargosError);
            return NextResponse.json({ error: cargosError.message }, { status: 500 });
        }

        // Adaptar la respuesta para mantener compatibilidad
        const sucursal = {
            ...sucursalData,
            _id: sucursalData.id,
            direccionId: sucursalData.direccion_id,
            cargos: cargos.map(cargo => ({
                ...cargo,
                _id: cargo.id,
                userId: cargo.usuario_id,
                user: cargo.usuario
            }))
        };

        const dependenciasFormatted = (dependencias || []).map(dep => ({
            ...dep,
            _id: dep.id,
            direccionId: dep.direccion_id,
            clienteId: dep.cliente?.id,
            sucursalId: params.id,
            operativa: dep.activa,
            cargos: (dep.cargos || []).map(cargo => ({
                ...cargo,
                _id: cargo.id,
                userId: cargo.usuario_id,
                dependenciaId: dep.id,
                user: cargo.usuario
            }))
        }));

        return NextResponse.json({ sucursal, dependencias: dependenciasFormatted });

    } catch (error) {
        console.error("Error fetching sucursal data:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// ---------------------------------------------------------------------------
// POST — guarda la sucursal completa (datos principales, cargos y dependencias).
// Diferencia el estado actual contra el payload: elimina lo que ya no viene,
// actualiza lo existente (por id) e inserta lo nuevo.
// ---------------------------------------------------------------------------
export async function POST(req, props) {
    try {
        const params = await props.params;
        const sucursalId = params.id;
        const body = await req.json();

        const { data: authResult } = await getAuthenticatedUser();
        if (!authResult || !authResult.userData) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const supabase = await getSupabaseServerClient();
        const now = new Date().toISOString();

        // Crea o actualiza una direccion y devuelve su id (o null si no hay datos).
        const upsertDireccion = async (direccion) => {
            if (!direccion || !direccion.direccionCliente) return null;
            const payload = {
                direccion_cliente: direccion.direccionCliente,
                place_id: direccion.placeId ?? null,
                latitud: direccion.latitud ?? null,
                longitud: direccion.longitud ?? null,
                comuna: direccion.comuna ?? null,
            };
            if (direccion.id) {
                const { error } = await supabase.from("direcciones").update(payload).eq("id", direccion.id);
                if (error) throw new Error(`Error actualizando direccion: ${error.message}`);
                return direccion.id;
            }
            const { data, error } = await supabase.from("direcciones").insert(payload).select("id").single();
            if (error) throw new Error(`Error creando direccion: ${error.message}`);
            return data.id;
        };

        // Sincroniza los cargos de un contenedor (sucursal o dependencia).
        const syncCargos = async (cargos, owner) => {
            const incoming = cargos ?? [];
            const filterColumn = owner.sucursal_id ? "sucursal_id" : "dependencia_id";
            const filterValue = owner.sucursal_id ?? owner.dependencia_id;

            const { data: existing, error: existingError } = await supabase
                .from("cargos")
                .select("id")
                .eq(filterColumn, filterValue);
            if (existingError) throw new Error(`Error leyendo cargos: ${existingError.message}`);

            const incomingIds = incoming.map((c) => c.id).filter(Boolean);
            const toDelete = (existing ?? []).map((c) => c.id).filter((id) => !incomingIds.includes(id));
            if (toDelete.length) {
                const { error } = await supabase.from("cargos").delete().in("id", toDelete);
                if (error) throw new Error(`Error eliminando cargos: ${error.message}`);
            }

            for (const cargo of incoming) {
                const row = {
                    usuario_id: cargo.usuarioId,
                    tipo: cargo.tipo,
                    desde: cargo.desde || null,
                    hasta: cargo.hasta || null,
                    activo: true,
                    sucursal_id: owner.sucursal_id ?? null,
                    dependencia_id: owner.dependencia_id ?? null,
                    updated_at: now,
                };
                if (cargo.id) {
                    const { error } = await supabase.from("cargos").update(row).eq("id", cargo.id);
                    if (error) throw new Error(`Error actualizando cargo: ${error.message}`);
                } else {
                    const { error } = await supabase.from("cargos").insert(row);
                    if (error) throw new Error(`Error creando cargo: ${error.message}`);
                }
            }
        };

        // 1. Direccion + datos principales de la sucursal.
        const direccionId = await upsertDireccion(body.direccion);
        const sucursalUpdate = {
            nombre: body.nombre,
            prioridad: body.prioridad ?? null,
            visible: body.visible ?? true,
            updated_at: now,
        };
        if (direccionId) sucursalUpdate.direccion_id = direccionId;

        const { error: sucursalError } = await supabase
            .from("sucursales")
            .update(sucursalUpdate)
            .eq("id", sucursalId);
        if (sucursalError) {
            return NextResponse.json({ error: `Error actualizando sucursal: ${sucursalError.message}` }, { status: 500 });
        }

        // 2. Cargos directos de la sucursal.
        await syncCargos(body.cargos, { sucursal_id: sucursalId });

        // 3. Dependencias (eliminar las que ya no vienen).
        const { data: existingDeps, error: depsError } = await supabase
            .from("dependencias")
            .select("id")
            .eq("sucursal_id", sucursalId);
        if (depsError) throw new Error(`Error leyendo dependencias: ${depsError.message}`);

        const incomingDeps = body.dependencias ?? [];
        const incomingDepIds = incomingDeps.map((d) => d.id).filter(Boolean);
        const depsToDelete = (existingDeps ?? []).map((d) => d.id).filter((id) => !incomingDepIds.includes(id));
        for (const depId of depsToDelete) {
            await supabase.from("cargos").delete().eq("dependencia_id", depId);
            const { error } = await supabase.from("dependencias").delete().eq("id", depId);
            if (error) throw new Error(`Error eliminando dependencia: ${error.message}`);
        }

        // 4. Crear / actualizar cada dependencia y sus cargos.
        for (const dep of incomingDeps) {
            const depDireccionId = await upsertDireccion(dep.direccion);
            const depRow = {
                sucursal_id: sucursalId,
                nombre: dep.nombre,
                tipo: dep.tipo,
                activa: dep.operativa ?? true,
                cliente_id: dep.cliente?.id ?? null,
                updated_at: now,
            };
            if (depDireccionId) depRow.direccion_id = depDireccionId;

            let depId = dep.id;
            if (depId) {
                const { error } = await supabase.from("dependencias").update(depRow).eq("id", depId);
                if (error) throw new Error(`Error actualizando dependencia: ${error.message}`);
            } else {
                const { data, error } = await supabase.from("dependencias").insert(depRow).select("id").single();
                if (error) throw new Error(`Error creando dependencia: ${error.message}`);
                depId = data.id;
            }

            await syncCargos(dep.cargos, { dependencia_id: depId });
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Error saving sucursal:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
