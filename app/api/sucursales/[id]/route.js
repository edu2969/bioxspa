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
                direccion:direcciones(
                    id,
                    direccion_cliente,
                    place_id,
                    latitud,
                    longitud
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

export async function POST(req, props) {
    const params = await props.params;
    const body = await req.json();
    await connectMongoDB();

    // 1. FOTO INICIAL DE CARGOS Y DEPENDENCIAS
    const cargosActualesSucursal = await Cargo.find({ sucursalId: params.id }).lean();
    const dependenciasActuales = await Dependencia.find({ sucursalId: params.id }).lean();

    // 2. ELIMINAR DEPENDENCIAS Y SUS CARGOS QUE YA NO ESTÁN EN EL BODY
    const dependenciaIdsInput = body.dependencias.map(dep => dep._id).filter(Boolean);
    const dependenciasAEliminar = dependenciasActuales.filter(dep => !dependenciaIdsInput.includes(dep._id.toString()));
    for (const dep of dependenciasAEliminar) {
        await Cargo.deleteMany({ dependenciaId: dep._id });
        await Dependencia.findByIdAndDelete(dep._id);
    }

    // 3. ELIMINAR CARGOS DE SUCURSAL QUE YA NO ESTÁN EN EL BODY
    const cargoIdsInput = body.cargos.map(cargo => cargo._id).filter(Boolean);
    const cargosSucursalAEliminar = cargosActualesSucursal.filter(cargo => !cargoIdsInput.includes(cargo._id.toString()));
    for (const cargo of cargosSucursalAEliminar) {
        await Cargo.findByIdAndDelete(cargo._id);
    }

    // 4. ELIMINAR CARGOS DE DEPENDENCIAS QUE YA NO ESTÁN EN EL BODY
    for (const dependencia of body.dependencias) {
        if (!dependencia._id) continue;
        const cargosActualesDep = await Cargo.find({ dependenciaId: dependencia._id }).lean();
        const cargoIdsInputDep = (dependencia.cargos || []).map(cargo => cargo._id).filter(Boolean);
        const cargosDepAEliminar = cargosActualesDep.filter(cargo => !cargoIdsInputDep.includes(cargo._id.toString()));
        for (const cargo of cargosDepAEliminar) {
            await Cargo.findByIdAndDelete(cargo._id);
        }
    }

    // 5. ACTUALIZAR O CREAR DIRECCIONES, DEPENDENCIAS Y CARGOS (como ya lo tienes)
    // Update or create Direccion for Sucursal
    let direccionId = body.direccionId;
    if (body.direccion) {
        const direccion = await Direccion.findOne({ apiId: body.direccion.apiId });
        if (direccion && direccion._id) {
            direccionId = direccion._id;
        }
    }
    if (!direccionId) {
        const newDireccion = new Direccion(body.direccion);
        const savedDireccion = await newDireccion.save();
        direccionId = savedDireccion._id;        
    }

    // Update or create Cargos for Sucursal
    for (const cargo of body.cargos) {
        const cargoData = {
            userId: cargo.userId,
            sucursalId: params.id,
            tipo: cargo.tipo,
            desde: new Date(cargo.desde),
            createdAt: cargo.createdAt ? new Date(cargo.createdAt) : new Date(),
            updatedAt: new Date()
        };
        if (cargo.hasta) {
            cargoData.hasta = new Date(cargo.hasta);
        }
        if (cargo._id) {
            await Cargo.findByIdAndUpdate(cargo._id, cargoData, { new: true, upsert: true });
        } else {
            const newCargo = new Cargo(cargoData);
            const savedCargo = await newCargo.save();
            if (!savedCargo || !savedCargo._id) {
                console.error("Error al insertar el cargo sucursal:", cargoData);
                throw new Error("No se pudo insertar el cargo de sucursal");
            }
        }
    }

    // Update Dependencias and their Direcciones
    for (const dependencia of body.dependencias) {
        let direccionId = dependencia.direccionId;
        
        // Check if direccion exists
        if (dependencia.direccion && !direccionId) {
            const direccion = await Direccion.findOne({ apiId: dependencia.direccion.apiId });
            if (direccion) {
                direccionId = direccion._id;
            } else {
                const newDireccion = new Direccion(dependencia.direccion);
                const savedDireccion = await newDireccion.save();
                direccionId = savedDireccion._id;
            }
        }

        const dependenciaData = {
            sucursalId: params.id,
            nombre: dependencia.nombre,
            direccionId: direccionId,
            operativa: dependencia.operativa,
            tipo: dependencia.tipo,
            createdAt: dependencia.createdAt ? new Date(dependencia.createdAt) : new Date(),
            updatedAt: new Date()
        };
        if (dependencia.clienteId) {
            dependenciaData.clienteId = dependencia.clienteId;
        }
        
        if (dependencia._id) {
            await Dependencia.findByIdAndUpdate(dependencia._id, dependenciaData, { new: true, upsert: true });
        } else {
            const newDependencia = new Dependencia(dependenciaData);
            await newDependencia.save();
        }

        // Update or create Cargos for Dependencia
        for (const cargo of dependencia.cargos) {
            const cargoData = {
                userId: cargo.userId,
                dependenciaId: dependencia._id,
                tipo: cargo.tipo,
                desde: new Date(cargo.desde),
                createdAt: cargo.createdAt ? new Date(cargo.createdAt) : new Date(),
                updatedAt: new Date()
            };
            if (cargo.hasta) {
                cargoData.hasta = new Date(cargo.hasta);
            }

            if (cargo._id) {
                await Cargo.findByIdAndUpdate(cargo._id, cargoData, { new: true, upsert: true });
            } else {
                const newCargo = new Cargo(cargoData);
                await newCargo.save();
            }
        }
    }

    // 6. ACTUALIZAR SUCURSAL
    const sucursalData = {
        id: body.id,
        nombre: body.nombre,
        visible: body.visible,
        prioridad: body.prioridad,
        direccionId: direccionId,
        createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
        updatedAt: new Date()
    };
    const sucursalUpdated = await Sucursal.findByIdAndUpdate(params.id, sucursalData, { new: true, upsert: true });

    // 7. RESPUESTA
    if (!sucursalUpdated) {
        return NextResponse.json({ error: "Error updating sucursal" }, { status: 404 });
    }
    return NextResponse.json(sucursalUpdated);
}