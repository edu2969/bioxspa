import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";
import { connectMongoDB } from "@/lib/mongodb";
import RutaDespacho from "@/models/rutaDespacho";
import Venta from "@/models/venta";
import Direccion from "@/models/direccion";
import { USER_ROLE } from "@/app/utils/constants";
import { IRutaDespacho } from "@/types/rutaDespacho";
import { IVenta } from "@/types/venta";
import { IDireccion } from "@/types/direccion";
import { IDestinoDisponible } from "@/types/types";

export async function GET(request: NextRequest) {
    try {
        console.log("GET request received for destinos.");
        
        // Obtener rutaId de query parameters
        const { searchParams } = new URL(request.url);
        const rutaId = searchParams.get('rutaId');
        
        if (!rutaId) {
            return NextResponse.json({ ok: false, error: "rutaId is required" }, { status: 400 });
        }

        console.log("Connecting to MongoDB...");
        await connectMongoDB();
        console.log("MongoDB connected.");

        console.log("Fetching server session...");
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.id) {
            console.warn("Unauthorized access attempt.");
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        console.log(`Fetching rutaDespacho with ID: ${rutaId}`);
        const rutaDespacho = await RutaDespacho.findById(rutaId).lean<IRutaDespacho>();

        if (!rutaDespacho) {
            console.warn(`RutaDespacho not found for ID: ${rutaId}`);
            return NextResponse.json({ ok: false, error: "RutaDespacho not found" }, { status: 404 });
        }

        // Verificar que el usuario tenga acceso a esta ruta
        if (String(rutaDespacho.choferId) !== session.user.id &&
            ![USER_ROLE.cobranza, 
                USER_ROLE.encargado, 
                USER_ROLE.responsable].includes(session.user.role)) {
            console.warn("User doesn't have access to this ruta", session.user.role);
            return NextResponse.json({ ok: false, error: "Access denied" }, { status: 403 });
        }

        // Obtener las direcciones ya asignadas en la ruta (sin fecha de arribo)
        const direccionesAsignadas = rutaDespacho.ruta
            ?.filter((tramo: any) => tramo.fechaArribo === null)
            ?.map((tramo: any) => String(tramo.direccionDestinoId)) || [];

        console.log(`Found ${direccionesAsignadas.length} direcciones already assigned`);

        // Obtener todas las ventas de la ruta
        const ventas = await Venta.find({
            _id: { $in: rutaDespacho.ventaIds }
        })
        .populate({
            path: 'clienteId',
            select: 'nombre'
        })
        .populate({
            path: 'direccionDespachoId',
            select: 'nombre clienteNombre'
        })
        .lean<IVenta[]>();

        // Recolectar todas las direcciones de despacho de las ventas
        const direccionesDespachoIds = ventas
            .map((venta: IVenta) => String(venta.direccionDespachoId?._id))
            .filter(d => {
                const rutas = rutaDespacho.ruta || [];
                return rutas.every(tramo => String(tramo.direccionDestinoId?._id) !== d || tramo.fechaArribo != null);
            })

        // Remover duplicados
        const direccionesUnicas = Array.from(new Set(direccionesDespachoIds));

        console.log(`Found ${direccionesUnicas.length} unique destination addresses: ${direccionesUnicas.join(", ")}`);

        // Obtener las direcciones desde la base de datos
        const direcciones = await Direccion.find({
            _id: { $in: direccionesUnicas }
        }).lean<IDireccion[]>();

        // Transformar a IDireccion
        const destinosDisponibles: IDestinoDisponible[] = direcciones.map((direccion: IDireccion) => ({
            direccionId: String(direccion._id),
            glosaDireccion: direccion.nombre || '',
            nombreCliente: ventas.find(v => String(v.direccionDespachoId) === String(direccion._id))?.clienteId?.nombre || ''
        }));

        console.log(`Returning ${destinosDisponibles.length} available destinations`);
        return NextResponse.json({ 
            ok: true, 
            destinos: destinosDisponibles
        });

    } catch (error) {
        console.error("ERROR in destinos:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}