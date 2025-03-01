import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Sucursal from "@/models/sucursal";
import Dependencia from "@/models/dependencia";
import Direccion from "@/models/direccion";
import Cliente from "@/models/cliente";
import Cargo from "@/models/cargo";
import User from "@/models/user";

export async function GET(req, { params }) {
    console.log("SUCURSAL getById...", params);
    await connectMongoDB();
    const sucursal = await Sucursal.findById(params.id).lean();
    if (!sucursal) {
        return NextResponse.json({ error: "Sucursal not found" }, { status: 400 });
    }
    const dependencias = await Dependencia.find({ sucursalId: sucursal._id }).lean();

    // Fetch the direccion for the sucursal
    let direccion = null;
    if (sucursal.direccionId) {
        console.log("DIRECCION ID...", sucursal.direccionId);
        direccion = await Direccion.findById(sucursal.direccionId).lean();
        console.log("Direccion", direccion);
        sucursal.direccion = direccion;
    }

    // Fetch the direccion for each dependencia
    for (const dependencia of dependencias) {
        if (dependencia.direccionId) {
            const dependenciaDireccion = await Direccion.findById(dependencia.direccionId).lean();
            dependencia.direccion = dependenciaDireccion;
        }
        if (dependencia.clienteId) {
            const cliente = await Cliente.findById(dependencia.clienteId).lean();
            dependencia.cliente = cliente;
        }
        const cargos = await Cargo.find({ dependenciaId: dependencia._id }).lean();
        for (const cargo of cargos) {
            const user = await User.findById(cargo.userId).lean();
            cargo.user = user;
        }
        dependencia.cargos = cargos;
    }

    const cargos = await Cargo.find({ sucursalId: sucursal._id }).lean();
    for (const cargo of cargos) {
        const user = await User.findById(cargo.userId).lean();
        cargo.user = user;
    }
    sucursal.cargos = cargos;
    console.log("SALDRÁ", { sucursal, dependencias });
    return NextResponse.json({ sucursal, dependencias });
}

export async function POST(req, { params }) {
    const body = await req.json();
    console.log("SUCURSAL Update v2...", body, params);

    // Update or create Direccion for Sucursal
    let direccionId = body.direccionId;
    if (body.direccion) {
        const direccion = await Direccion.findOne({ apiId: body.direccion.apiId });
        if (direccion) {
            if (direccion._id) {
                direccionId = direccion._id;
            }
        }
    }
    if (!direccionId) {
        console.log("NUEVA DIRECCION...", body.direccion);
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
            hasta: new Date(cargo.hasta),
            createdAt: cargo.createdAt ? new Date(cargo.createdAt) : new Date(),
            updatedAt: new Date()
        };

        console.log("CARGO DATA...", cargoData);

        if (cargo._id) {
            await Cargo.findByIdAndUpdate(cargo._id, cargoData, { new: true, upsert: true });
        } else {
            const newCargo = new Cargo(cargoData);
            await newCargo.save();
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

        console.log("DEPENDENCIA DATA...", dependenciaData);

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
            if(cargo.hasta) {
                cargoData.hasta = new Date(cargo.hasta);
            }

            console.log("CARGO DATA...", cargoData);

            if (cargo._id) {
                await Cargo.findByIdAndUpdate(cargo._id, cargoData, { new: true, upsert: true });
            } else {
                const newCargo = new Cargo(cargoData);
                await newCargo.save();
            }
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