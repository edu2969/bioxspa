import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Sucursal from "@/models/sucursal";
import Bodega from "@/models/bodega";
import Direccion from "@/models/direccion";

export async function GET(req, { params }) {
    console.log("SUCURSAL getById...", params);
    await connectMongoDB();
    const sucursal = await Sucursal.findById(params.id).lean();
    if (!sucursal) {
        return NextResponse.json({ error: "Sucursal not found" }, { status: 400 });
    }
    const bodegas = await Bodega.find({ sucursalId: sucursal._id }).lean();

    // Fetch the direccion for the sucursal
    let direccion = null;
    if (sucursal.direccionId) {
        console.log("DIRECCION ID...", sucursal.direccionId);
        direccion = await Direccion.findById(sucursal.direccionId).lean();
        console.log("Direccion", direccion);
        sucursal.direccion = direccion;
    }

    // Fetch the direccion for each bodega
    for (const bodega of bodegas) {
        if (bodega.direccionId) {
            const bodegaDireccion = await Direccion.findById(bodega.direccionId).lean();
            bodega.direccion = bodegaDireccion;
        }
    }

    console.log("SALDRÁ", { sucursal, bodegas });

    return NextResponse.json({ sucursal, bodegas });
}

export async function POST(req, { params }) {
    const body = await req.json();
    console.log("SUCURSAL Update...", body, params);

    // Update or create Direccion for Sucursal
    let direccionId = body.direccionId;
    if (body.direccion) {
        const direccion = await Direccion.findOne({ apiId: body.direccion.apiId });
        if (direccion) {
            if(direccion._id) {
                direccionId = direccion._id;
            }
        }
    }
    if(!direccionId) {        
        console.log("NUEVA DIRECCION...", body.direccion);
        const newDireccion = new Direccion(body.direccion);
        const savedDireccion = await newDireccion.save();
        direccionId = savedDireccion._id;
    }

    // Update Bodegas and their Direcciones
    for (const bodega of body.bodegas) {
        let direccionId = bodega.direccionId;

        // Check if direccion exists
        if (bodega.direccion && !direccionId) {
            const direccion = await Direccion.findOne({ apiId: bodega.direccion.apiId });
            if (direccion) {
                direccionId = direccion._id;
            } else {
                const newDireccion = new Direccion(bodega.direccion);
                const savedDireccion = await newDireccion.save();
                direccionId = savedDireccion._id;
            }
        }

        const bodegaData = {
            sucursalId: params.id,
            nombre: bodega.nombre,
            direccionId: direccionId,
            operativa: bodega.operativa,
            createdAt: bodega.createdAt ? new Date(bodega.createdAt) : new Date(),
            updatedAt: new Date()
        };

        console.log("BODEGA DATA...", bodegaData);

        if (bodega._id) {
            await Bodega.findByIdAndUpdate(bodega._id, bodegaData, { new: true, upsert: true });
        } else {
            const newBodega = new Bodega(bodegaData);
            await newBodega.save();
        }
    }

    // Update Sucursal
    const sucursalData = {
        id: body.id,
        nombre: body.nombre,
        visible: body.visible,
        prioridad: body.prioridad,
        direccionId: direccionId,
        createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
        updatedAt: new Date()
    };
    console.log("SUCURSAL DATA...", sucursalData);
    const sucursalUpdated = await Sucursal.findByIdAndUpdate(params.id, sucursalData, { new: true, upsert: true });    

    if (!sucursalUpdated) {
        return NextResponse.json({ error: "Error updating sucursal" }, { status: 404 });
    }
    return NextResponse.json(sucursalUpdated);
}