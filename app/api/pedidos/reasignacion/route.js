import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/utils/authOptions";
import User from "@/models/user";
import Cargo from "@/models/cargo";
import Venta from "@/models/venta";
import RutaDespacho from "@/models/rutaDespacho";
import { USER_ROLE, TIPO_ESTADO_VENTA, TIPO_ESTADO_RUTA_DESPACHO } from "@/app/utils/constants";

export async function POST(request) {
    try {
        await connectMongoDB();

        // Get ventaId from request
        const { ventaId } = await request.json();
        
        // Validate ventaId
        if (!ventaId) {
            return NextResponse.json({ ok: false, error: "ventaId is required" }, { status: 400 });
        }

        // Get user from session
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        
        // Verify the user is a driver (conductor)
        const user = await User.findById(userId);
        if (!user) {
            return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
        }

        // Verify user has the required role (manager or supervisor)
        if (user.role && ![USER_ROLE.gerente, USER_ROLE.cobranza, USER_ROLE.encargado].includes(user.role)) {
            return NextResponse.json({ 
                ok: false, 
                error: "Insufficient permissions - requires manager or supervisor role" 
            }, { status: 403 });
        }
        
        // Verify the user has a conductor cargo assigned
        const cargo = await Cargo.findOne({ 
            userId: userId,
            tipo: { $in: [USER_ROLE.gerente, USER_ROLE.cobranza, USER_ROLE.encargado] },
            hasta: null 
        });
        
        if (!cargo) {
            return NextResponse.json({ ok: false, error: "User is not authorized" }, { status: 403 });
        }

        // Find the rutaDespacho that contains this venta
        const rutaDespacho = await RutaDespacho.findOne({
            ventaIds: ventaId,            
            estado: { $lte: TIPO_ESTADO_RUTA_DESPACHO.seleccion_destino }
        });

        if (rutaDespacho) {
            // Remove the ventaId from the rutaDespacho
            await RutaDespacho.findByIdAndUpdate(
                rutaDespacho._id,
                { $pull: { ventaIds: ventaId } }
            );

            if(rutaDespacho.ventaIds.length === 1) {
                // Delete the route if it becomes empty
                await RutaDespacho.findByIdAndDelete(rutaDespacho._id);
            }
        }
        
        // Update the venta status back to borrador
        await Venta.findByIdAndUpdate(
            ventaId,
            { estado: TIPO_ESTADO_VENTA.por_asignar }
        );

        return NextResponse.json({ 
            ok: true, 
            message: "Venta successfully unassigned and returned to draft status" 
        });
        
    } catch (error) {
        console.error("Error in POST /desasignacion:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}