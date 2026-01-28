import { NextResponse } from "next/server";
import { migrateAuthEndpoint } from "@/lib/auth/apiMigrationHelper";
import { authOptions } from "@/app/utils/authOptions";
import { supabase } from "@/lib/supabase";

export async function GET(request) {
    try {
        await connectMongoDB();

        // Register models if not already registered
        if (!mongoose.models.User) {
            mongoose.model("User", User.schema);
        }
        if (!mongoose.models.Venta) {
            mongoose.model("Venta", Venta.schema);
        }

        const session = await getServerSession(authOptions);
        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const ventaId = searchParams.get('ventaId');

        if (!ventaId || !mongoose.Types.ObjectId.isValid(ventaId)) {
            return NextResponse.json({ ok: false, error: "Invalid ventaId" }, { status: 400 });
        }

        const venta = await Venta.findById(ventaId)
            .populate({
                path: "comentariosCobro.userId",
                model: "User",
                select: "name email"
            })
            .select("comentariosCobro")
            .lean();

        if (!venta) {
            return NextResponse.json({ ok: false, error: "Venta not found" }, { status: 404 });
        }

        // Procesar comentarios con información del avatar
        const comentariosFormateados = venta.comentariosCobro?.map(comentario => {
            const usuario = comentario.userId;
            let avatar = null;
            
            if (usuario?.email) {
                const nombreAvatar = usuario.email.split('@')[0];
                avatar = `${nombreAvatar}.jpg`; // Extensión actual como mencionaste
            }

            return {
                _id: comentario._id,
                fecha: comentario.fecha,
                comentario: comentario.comentario,
                usuario: {
                    _id: usuario?._id,
                    nombre: usuario?.name,
                    email: usuario?.email,
                    avatar: avatar
                },
                createdAt: comentario.createdAt,
                updatedAt: comentario.updatedAt
            };
        }) || [];

        return NextResponse.json({ 
            ok: true, 
            comentarios: comentariosFormateados 
        });

    } catch (error) {
        console.error("ERROR getting comentarios:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        await connectMongoDB();

        // Register models if not already registered
        if (!mongoose.models.User) {
            mongoose.model("User", User.schema);
        }
        if (!mongoose.models.Venta) {
            mongoose.model("Venta", Venta.schema);
        }

        const session = await getServerSession(authOptions);
        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { ventaId, comentario } = body;

        if (!ventaId || !comentario) {
            return NextResponse.json({ 
                ok: false, 
                error: "ventaId and comentario are required" 
            }, { status: 400 });
        }

        if (!mongoose.Types.ObjectId.isValid(ventaId)) {
            return NextResponse.json({ ok: false, error: "Invalid ventaId" }, { status: 400 });
        }

        // Crear el nuevo comentario
        const nuevoComentario = {
            fecha: new Date(),
            userId: session.user.id,
            comentario: comentario.trim()
        };

        // Actualizar la venta agregando el comentario
        const ventaActualizada = await Venta.findByIdAndUpdate(
            ventaId,
            { 
                $push: { 
                    comentariosCobro: nuevoComentario 
                } 
            },
            { 
                new: true,
                runValidators: true
            }
        ).populate({
            path: "comentariosCobro.userId",
            model: "User",
            select: "name email"
        });

        if (!ventaActualizada) {
            return NextResponse.json({ ok: false, error: "Venta not found" }, { status: 404 });
        }

        // Obtener el comentario recién agregado con la información del usuario
        const comentarioAgregado = ventaActualizada.comentariosCobro[ventaActualizada.comentariosCobro.length - 1];
        const usuario = comentarioAgregado.userId;
        
        let avatar = null;
        if (usuario?.email) {
            const nombreAvatar = usuario.email.split('@')[0];
            avatar = `${nombreAvatar}.jpg`;
        }

        const comentarioFormateado = {
            _id: comentarioAgregado._id,
            fecha: comentarioAgregado.fecha,
            comentario: comentarioAgregado.comentario,
            usuario: {
                _id: usuario?._id,
                nombre: usuario?.name,
                email: usuario?.email,
                avatar: avatar
            },
            createdAt: comentarioAgregado.createdAt,
            updatedAt: comentarioAgregado.updatedAt
        };

        return NextResponse.json({ 
            ok: true, 
            comentario: comentarioFormateado,
            message: "Comentario agregado exitosamente" 
        });

    } catch (error) {
        console.error("ERROR adding comentario:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}