import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Direccion from "@/models/direccion";
import mongoose from "mongoose";
import Cliente from "@/models/cliente";

// filepath: d:/git/bioxspa/app/api/ventas/direccionDespacho/route.js

export async function POST(req) {
    try {
        console.log("Conectando a MongoDB...");
        await connectMongoDB();
        const body = await req.json();
        console.log("Body recibido v2:", body);

        // Espera recibir un objeto con la dirección y place_id
        // {
        //   direccion: { nombre, latitud, longitud, categoria },
        //   place_id: "string"
        // }

        if (!body || !body.clienteId || !body.direccion || !body.direccion.nombre || !body.direccion.latitud || !body.direccion.longitud || !body.direccion.apiId) {
            console.warn("Datos de dirección incompletos:", body);
            return NextResponse.json({ error: "Datos de dirección incompletos" }, { status: 400 });
        }

        // Buscar si ya existe la dirección por place_id
        let direccion = await Direccion.findOne({ apiId: body.direccion.apiId });
        console.log("Dirección encontrada:", direccion);

        if (!direccion) {
            // Crear nueva dirección
            direccion = new Direccion({
                _id: new mongoose.Types.ObjectId().toString(),
                nombre: body.direccion.nombre,
                apiId: body.place_id,
                latitud: body.direccion.latitud,
                longitud: body.direccion.longitud
            });
            await direccion.save();
            console.log("Nueva dirección guardada:", direccion);
        } else {
            // Actualizar datos si ya existe
            direccion.nombre = body.direccion.nombre;
            direccion.latitud = body.direccion.latitud;
            direccion.longitud = body.direccion.longitud;
            await direccion.save();
            console.log("Dirección actualizada:", direccion);
        }
        
        // Agregar la dirección de despacho al cliente
        const cliente = await Cliente.findById(body.clienteId);
        if (!cliente) {
            return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
        }

        // Evitar duplicados por direccionId
        const yaExiste = cliente.direccionesDespacho.some(
            (d) => d.direccionId.toString() === direccion._id.toString()
        );

        if (!yaExiste) {
            cliente.direccionesDespacho.push({
                direccionId: direccion._id,
                comentario: body.comentario || null
            });
            await cliente.save();
        }

        return NextResponse.json({ ok: true, direccion });
    } catch (error) {
        console.error("Error registrando dirección:", error);
        return NextResponse.json({ error: "Error registrando dirección" }, { status: 500 });
    }
}