import { supabase } from "@/lib/supabase";
import { connectMongoDB } from "@/lib/mongodb";
import Direccion from "@/models/direccion";
import Cliente from "@/models/cliente";
import { NextResponse } from "next/server";

export async function GET(req) {
    console.log("[GET /api/regenerator] Starting migration v.191");

    try {
        // Connect to MongoDB
        await connectMongoDB();
        console.log("[GET /api/regenerator] Connected to MongoDB");

        // Fetch all clients and addresses from MongoDB
        const clientesMongo = await Cliente.find().select("_id temporalId direccionId direccionesDespacho").lean();
        const direccionesMongo = await Direccion.find({
            $and: [{ apiId: { $ne: null } }, { apiId: { $exists: true } }]
        }).select("_id apiId").lean();

        console.log(`[GET /api/regenerator] Fetched ${clientesMongo.length} clients and ${direccionesMongo.length} addresses from MongoDB`);

        // Función para obtener todos los registros con paginación
        async function fetchAllFromSupabase(table, columns) {
            const allData = [];
            let from = 0;
            const limit = 1000;

            while (true) {
                const { data, error } = await supabase
                    .from(table)
                    .select(columns)
                    .range(from, from + limit - 1);

                if (error) {
                    console.error(`[GET /api/regenerator] Error fetching data from Supabase table '${table}':`, error);
                    throw new Error(`Error fetching data from Supabase table '${table}'`);
                }

                if (data.length === 0) {
                    break;
                }

                allData.push(...data);
                from += limit;
            }

            return allData;
        }

        // Fetch all addresses from Supabase with pagination
        const direccionesSupabase = await fetchAllFromSupabase("direcciones", "id, api_id");
        const clientesSupabase = await fetchAllFromSupabase("clientes", "id, temporal_id");

        console.log(`[GET /api/regenerator] Fetched ${direccionesSupabase.length} addresses and ${clientesSupabase.length} clients from Supabase`);

        // Build a map of Supabase addresses by api_id
        const direccionesSupabaseMap = new Map(
            direccionesSupabase.map((direccion) => [String(direccion.api_id), direccion.id])
        );
        
        // Fetch all clients from Supabase
        const clientesSupabaseMap = new Map(
            clientesSupabase.map((cliente) => [String(Number(cliente.temporal_id)), cliente.id])
        );

        console.log("[GET /api/regenerator] Supabase maps Lengths:", direccionesSupabaseMap.size, clientesSupabaseMap.size);

        // Prepare updates for main addresses and dispatch addresses
        const clientesToUpdate = [];
        const clienteDireccionesToInsert = [];

        // Procesamiento de clientesMongo con ajuste en temporalId
        for (const cliente of clientesMongo) {
            const temporalId = String(Number(cliente.temporalId));
            const clienteIdSupabase = clientesSupabaseMap.get(temporalId);

            if (!clienteIdSupabase) {
                console.error(
                    `[GET /api/regenerator] Missing Supabase client for temporalId: '${temporalId}'. Migration stopped.`
                );
                continue;
            }

            console.log(`[GET /api/regenerator] Found Supabase client: temporalId='${temporalId}', id=${clienteIdSupabase}`);

            // Update main address (direccion_id)
            if (cliente.direccionId) {
                const direccionMongo = direccionesMongo.find(d => String(d._id) === String(cliente.direccionId));
                if (direccionMongo) {
                    const direccionIdSupabase = direccionesSupabaseMap.get(String(direccionMongo.apiId));
                    if (direccionIdSupabase) {
                        clientesToUpdate.push({
                            id: clienteIdSupabase,
                            direccion_id: direccionIdSupabase,
                        });
                    } else {
                        console.warn(`[GET /api/regenerator] Missing Supabase address for API ID: '${direccionMongo.apiId}'`);
                    }
                } else {
                    console.warn(`[GET /api/regenerator] Missing MongoDB address for direccionId: '${cliente.direccionId}'`);
                }
            }

            // Insert dispatch addresses
            if (cliente.direccionesDespacho && cliente.direccionesDespacho.length > 0) {
                for (const despacho of cliente.direccionesDespacho) {
                    const direccionMongo = direccionesMongo.find(d => String(d._id) === String(despacho.direccionId));
                    if (direccionMongo) {
                        const direccionIdSupabase = direccionesSupabaseMap.get(String(direccionMongo.apiId).trim());
                        if (direccionIdSupabase) {
                            clienteDireccionesToInsert.push({
                                cliente_id: clienteIdSupabase,
                                direccion_id: direccionIdSupabase,
                                activa: true,
                            });
                        } else {
                            console.warn(`[GET /api/regenerator] Missing Supabase dispatch address for API ID: '${direccionMongo.apiId}'`);
                        }
                    } else {
                        console.warn(`[GET /api/regenerator] Missing MongoDB dispatch address for direccionId: '${despacho.direccionId}'`);
                    }
                }
            }
        }

        console.log(`[GET /api/regenerator] Prepared ${clientesToUpdate.length} clients for main address update`);
        console.log(`[GET /api/regenerator] Prepared ${clienteDireccionesToInsert.length} dispatch addresses for insertion`);

        // Update main addresses in Supabase
        for (const cliente of clientesToUpdate) {
            const { error: updateError } = await supabase
                .from("clientes")
                .update({ direccion_id: cliente.direccion_id })
                .eq("id", cliente.id);

            if (updateError) {
                console.error(
                    `[GET /api/regenerator] Error updating main address for client ${cliente.id}:`,
                    updateError
                );
            }
        }

        console.log("[GET /api/regenerator] Successfully updated main addresses for clients in Supabase");

        // Insert dispatch addresses into Supabase
        const { error: insertError } = await supabase
            .from("cliente_direcciones_despacho")
            .upsert(clienteDireccionesToInsert, { onConflict: ["cliente_id", "direccion_id"] });

        if (insertError) {
            console.error("[GET /api/regenerator] Error inserting dispatch addresses into Supabase:", insertError);
            return NextResponse.json({ error: "Error inserting dispatch addresses into Supabase" }, { status: 500 });
        }

        console.log("[GET /api/regenerator] Successfully updated dispatch addresses for clients in Supabase");

        return NextResponse.json({ ok: true, message: "Client and address migration successfully completed in Supabase" });
    } catch (error) {
        console.error("[GET /api/regenerator] Unexpected error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
