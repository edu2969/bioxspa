import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import User from "@/models/user";
import Sucursal from "@/models/sucursal";
import Vehiculo from "@/models/vehiculo";
import Venta from "@/models/venta";
import InformacionEmpresa from "@/models/informacionEmpresa";
import Cliente from "@/models/cliente";
import DetalleVenta from "@/models/detalleVenta";
import DocumentoTributario from "@/models/documentoTributario";
import CuotaPagada from "@/models/cuotaPagada";
import CuotaCobrada from "@/models/cuotaCobrada";
import CategoriaProducto from "@/models/categoriaProducto";

const parseDateString = (dateString) => {
    if (!dateString) {
        return null;
    }
    const parts = dateString.split('-');
    if (parts[0].length === 4) {
        // Assuming format is YYYY-MM-DD
        const [year, month, day] = parts;
        console.log("PARSING DATE", year, month, day);
        return new Date(`${year}-${month}-${day}`);
    } else {
        // Assuming format is DD-MM-YYYY
        const [day, month, year] = parts;
        console.log("PARSING DATE", year, month, day);
        return new Date(`${year}-${month}-${day}`);
    }
};

export async function POST(req) {
    try {
        await connectMongoDB();
        const { filename, entities } = await req.json();
        console.log("IMPORTING DATA", filename, entities.length, "records");
        
        const batchSize = 1000;
        const processedEntities = [];
        const totalBatches = Math.ceil(entities.length / batchSize);            
        for (let i = 0; i < entities.length; i += batchSize) {
            const batch = entities.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch.map(async (entity) => {
                let Model;
                if (filename.includes("user")) {
                    Model = User;
                } else if (filename.includes("sucursal")) {
                    Model = Sucursal;
                } else if (filename.includes("vehiculo")) {
                    Model = Vehiculo;
                } else if (filename.includes("informacion_empresa")) {
                    Model = InformacionEmpresa;
                } else if (filename.includes("cliente")) {
                    Model = Cliente;
                } else if (filename.includes("detalle_venta")) {
                    Model = DetalleVenta;
                } else if (filename.includes("documentotributario")) {
                    Model = DocumentoTributario;
                } else if (filename.includes("cuotaPagada")) {
                    Model = CuotaPagada;
                } else if (filename.includes("cuotaCobrada")) {
                    Model = CuotaCobrada;
                } else if (filename.includes("venta")) {
                    Model = Venta;
                } else if (filename.includes("categoria_productos")) {
                    Model = CategoriaProducto;
                } else {
                    return null;
                }

                if (entity.FchResol) {
                    entity.FchResol = parseDateString(entity.FchResol);
                }

                const exists = await Model.findOne({ id: entity.id });
                if (exists) {
                    exists.set(entity);
                    await exists.save();
                    return exists;
                } else {
                    if (Model === User && entity.password) {
                        entity.password = await bcrypt.hash(entity.password, 10);
                    }
                    return await Model.create(entity);
                }
            }));
            processedEntities.push(...batchResults);
            const currentBatch = Math.ceil((i + batchSize) / batchSize);
            const percentage = ((currentBatch / totalBatches) * 100).toFixed(2);
            console.log(`Processing batch ${currentBatch} of ${totalBatches} (${percentage}%)`);
        }

        if (processedEntities.includes(null)) {
            return NextResponse.json({
                ok: false,
                message: "Filename does not contain valid entities"
            }, { status: 400 });
        }

        console.log("IMPORTED DATA", processedEntities.length, "records OK! 🚀");

        return NextResponse.json({
            ok: true,
            processedEntities: processedEntities
        });
    } catch (error) {
        console.log("ERROR!", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}