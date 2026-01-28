import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import Precio from "@/models/precio";
import SubcategoriaCatalogo from "@/models/subcategoriaCatalogo";
import Cliente from "@/models/cliente";

export async function GET() {
    console.log("Fetching precios from Supabase...");

    console.log("Fetching clients with precios...");
    const { data: clients, error: clientsError } = await supabase
        .from('clientes')
        .select(`
            id,
            nombre,
            rut,
            email,
            telefono,
            precios (
                id,
                valor,
                fecha_desde,
                subcategoria_catalogo_id,
                subcategoria_catalogos (
                    id,
                    nombre,
                    categoria_catalogo_id
                )
            )
        `)
        .order('nombre');

    if (clientsError) {
        console.error('Error fetching clients with precios:', clientsError);
        return NextResponse.json({ error: "Error fetching precios" }, { status: 500 });
    }

    console.log(`Fetched ${clients.length} clients`);

    console.log("Mapping clients with precios...");
    const clientsWithPrecios = clients.map(client => {
        const preciosWithDetails = client.precios.map(precio => ({
            valor: precio.valor,
            fechaDesde: precio.fecha_desde,
            subcategoriaCatalogoId: precio.subcategoria_catalogo_id,
            categoriaId: precio.subcategoria_catalogos?.categoria_catalogo_id || null
        }));
        
        return { 
            cliente: { 
                nombre: client.nombre, 
                _id: client.id, 
                rut: client.rut 
            },
            precios: preciosWithDetails 
        };
    });

    console.log("Returning clients with precios");
    return NextResponse.json(clientsWithPrecios);
}

export async function POST(req) {
    console.log("Creating/updating precio in Supabase...");

    const body = await req.json();
    console.log("Received body:", body);

    // Extraer datos del payload
    const {
        precioId,
        subcategoriaCatalogoId,
        valor,
        clienteId
    } = body;

    // Validación básica
    if (!subcategoriaCatalogoId || !clienteId) {
        console.warn("Missing subcategoriaCatalogoId or clienteId");
        return NextResponse.json({ error: "subcategoriaCatalogoId y clienteId son requeridos" }, { status: 400 });
    }

    try {
        // Buscar si existe el precio
        let precio;
        if (precioId) {
            console.log(`Looking for Precio by precioId: ${precioId}`);
            const { data: existingPrecio, error } = await supabase
                .from('precios')
                .select('*')
                .eq('id', precioId)
                .single();
            precio = existingPrecio;
        } else {        
            console.log(`Looking for Precio by clienteId: ${clienteId} and subcategoriaCatalogoId: ${subcategoriaCatalogoId}`);
            const { data: existingPrecio, error } = await supabase
                .from('precios')
                .select('*')
                .eq('cliente_id', clienteId)
                .eq('subcategoria_catalogo_id', subcategoriaCatalogoId)
                .single();
            
            if (existingPrecio) {
                console.warn("Precio already exists for this clienteId and subcategoriaCatalogoId");
                return NextResponse.json({ error: "Ya existe un precio para este cliente y subcategoría" }, { status: 400 });
            }
        }

        if (precio) {
            console.log("Precio found, updating historial and fields");
            // Actualizar historial
            const historial = Array.isArray(precio.historial) ? precio.historial : [];
            const valorAnterior = precio.valor || 0;
            const varianza = valorAnterior !== 0 ? ((valor - valorAnterior) / valorAnterior) * 100 : 0;
            historial.push({
                valor: valorAnterior,
                fecha: precio.fecha_desde,
                varianza
            });

            // Actualizar precio
            const { data: updatedPrecio, error: updateError } = await supabase
                .from('precios')
                .update({
                    subcategoria_catalogo_id: subcategoriaCatalogoId,
                    valor: valor,
                    fecha_desde: new Date().toISOString(),
                    historial: historial
                })
                .eq('id', precio.id)
                .select('*')
                .single();

            if (updateError) {
                console.error('Error updating precio:', updateError);
                return NextResponse.json({ error: "Error updating precio" }, { status: 500 });
            }

            console.log("Precio updated:", updatedPrecio);
            return NextResponse.json({ ok: true, precio: updatedPrecio });
        } else {
            console.log("Precio not found, creating new Precio");
            // Crear nuevo precio
            const { data: nuevoPrecio, error: createError } = await supabase
                .from('precios')
                .insert([{
                    cliente_id: clienteId,
                    subcategoria_catalogo_id: subcategoriaCatalogoId,
                    valor: valor,
                    fecha_desde: new Date().toISOString(),
                    historial: []
                }])
                .select('*')
                .single();

            if (createError) {
                console.error('Error creating precio:', createError);
                return NextResponse.json({ error: "Error creating precio" }, { status: 500 });
            }

            console.log("Nuevo Precio created:", nuevoPrecio);
            return NextResponse.json({ ok: true, precio: nuevoPrecio });
        }
    } catch (error) {
        console.error("Error in POST precios:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST_MONGO(req) {
    console.log("Starting migration of precios from MongoDB to Supabase...");

    try {
        // Connect to MongoDB
        await connectMongoDB();
        console.log("Connected to MongoDB");

        // Fetch all precios from MongoDB
        const precios = await Precio.find().lean();
        console.log(`Fetched ${precios.length} precios from MongoDB`);

        // Fetch all subcategories from MongoDB
        const subcategoriasMongo = await SubcategoriaCatalogo.find().select("_id temporalId").lean();
        console.log(`Fetched ${subcategoriasMongo.length} subcategories from MongoDB`);

        // Map MongoDB subcategories by _id
        const subcategoriasMongoMap = new Map(
            subcategoriasMongo.map((sub) => [sub._id.toString(), sub.temporalId])
        );

        // Fetch all clients from MongoDB
        const clientesMongo = await Cliente.find().select("_id temporalId").lean();
        console.log(`Fetched ${clientesMongo.length} clients from MongoDB`);

        // Map MongoDB clients by _id
        const clientesMongoMap = new Map(
            clientesMongo.map((cliente) => [cliente._id.toString(), cliente.temporalId])
        );

        // Fetch all subcategories from Supabase
        const { data: subcategoriasSupabase, error: subcategoriasError } = await supabase
            .from("subcategorias_catalogo")
            .select("id, temporal_id");

        if (subcategoriasError) {
            console.error("Error fetching subcategories from Supabase:", subcategoriasError);
            return NextResponse.json({ error: "Error fetching subcategories from Supabase" }, { status: 500 });
        }

        console.log(`Fetched ${subcategoriasSupabase.length} subcategories from Supabase`);

        // Map Supabase subcategories by temporal_id
        const subcategoriasSupabaseMap = new Map(
            subcategoriasSupabase.map((sub) => [sub.temporal_id, sub.id])
        );

        // Fetch all clients from Supabase
        const { data: clientesSupabase, error: clientesError } = await supabase
            .from("clientes")
            .select("id, temporal_id");

        if (clientesError) {
            console.error("Error fetching clients from Supabase:", clientesError);
            return NextResponse.json({ error: "Error fetching clients from Supabase" }, { status: 500 });
        }

        console.log(`Fetched ${clientesSupabase.length} clients from Supabase`);

        // Map Supabase clients by temporal_id
        const clientesSupabaseMap = new Map(
            clientesSupabase.map((cliente) => [cliente.temporal_id, cliente.id])
        );

        // Prepare data for insertion into Supabase
        const preciosToInsert = precios.map((precio) => {
            const temporalIdSubcategoria = subcategoriasMongoMap.get(precio.subcategoriaCatalogoId?.toString());
            const subcategoriaId = subcategoriasSupabaseMap.get(temporalIdSubcategoria);

            const temporalIdCliente = clientesMongoMap.get(precio.clienteId?.toString());
            const clienteId = clientesSupabaseMap.get(temporalIdCliente);

            if (!subcategoriaId || !clienteId) {
                console.warn(
                    `Skipping precio due to missing subcategory or client: ${precio._id}`
                );
                return null;
            }

            return {
                cliente_id: clienteId,
                subcategoria_catalogo_id: subcategoriaId,
                moneda: "CLP",
                tipo: precio.tipo,
                fecha_desde: precio.fechaDesde,
                fecha_hasta: precio.fechaHasta,
                valor: precio.valor,
                valor_bruteo: precio.valorBruteo,
                impuesto: precio.impuesto
            };
        }).filter(Boolean);

        console.log(`Prepared ${preciosToInsert.length} precios for insertion into Supabase`);

        // Insert data into Supabase
        const { error: insertError } = await supabase
            .from("precios")
            .insert(preciosToInsert);

        if (insertError) {
            console.error("Error inserting precios into Supabase:", insertError);
            return NextResponse.json({ error: "Error inserting precios into Supabase" }, { status: 500 });
        }

        console.log("Successfully migrated precios to Supabase");
        return NextResponse.json({ ok: true, message: "Precios successfully migrated to Supabase" });
    } catch (error) {
        console.error("Unexpected error during migration:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}