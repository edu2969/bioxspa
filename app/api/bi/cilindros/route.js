import mongoose from "mongoose";
import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";
import BICilindro from "@/models/biCilindro";
import Cargo from "@/models/cargo";
import Sucursal from "@/models/sucursal";
import Dependencia from "@/models/dependencia";
import SubcategoriaCatalogo from "@/models/subcategoriaCatalogo";
import { TIPO_DEPENDENCIA } from "@/app/utils/constants";

// Helper para obtener direcciones propias
async function getDireccionesPropias(userId) {
    console.log(`[getDireccionesPropias] Buscando cargo activo para userId: ${userId}`);
    // Cargo activo    
    const cargo = await Cargo.findOne({ userId, hasta: null });
    if (!cargo) {
        console.warn(`[getDireccionesPropias] No se encontró cargo activo para userId: ${userId}`);
        return [];
    }
    // Sucursal y dependencias válidas
    const sucursalId = cargo.sucursalId;
    console.log(`[getDireccionesPropias] sucursalId: ${sucursalId}`);
    const dependencias = await Dependencia.find({
        sucursalId,
        tipo: { $in: [TIPO_DEPENDENCIA.sucursal, TIPO_DEPENDENCIA.bodega, TIPO_DEPENDENCIA.sucursal_bodega] }
    });
    console.log(`[getDireccionesPropias] dependencias encontradas: ${dependencias.length}`);

    // Direcciones de sucursal y dependencias
    const sucursal = await Sucursal.findById(sucursalId);
    let direccionIds = [];
    if (sucursal?.direccionId) {
        direccionIds.push(sucursal.direccionId.toString());
        console.log(`[getDireccionesPropias] dirección de sucursal agregada: ${sucursal.direccionId.toString()}`);
    }
    dependencias.forEach(dep => {
        if (dep.direccionId) {
            direccionIds.push(dep.direccionId.toString());
            console.log(`[getDireccionesPropias] dirección de dependencia agregada: ${dep.direccionId.toString()}`);
        }
    });
    console.log(`[getDireccionesPropias] direcciónIds finales:`, direccionIds);
    return direccionIds;
}

export async function GET(req) {
    try {
        await connectMongoDB();
        console.log("[GET /api/bi/cilindros] Conectado a MongoDB");

        // 1. Obtener usuario en sesión (ajusta según tu auth)
        console.log("Fetching server session...");
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.id) {
            console.warn("Unauthorized access attempt.");
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        console.log(`[GET /api/bi/cilindros] userId: ${userId}`);

        if (!mongoose.models.SubcategoriaCatalogo) {
            mongoose.model("SubcategoriaCatalogo", SubcategoriaCatalogo.schema);
        }

        // 2. Direcciones propias
        const direccionIdsPropias = await getDireccionesPropias(userId);
        console.log(`[GET /api/bi/cilindros] Direcciones propias:`, direccionIdsPropias);

        // 3. Parsear query
        const { searchParams } = new URL(req.url);
        const subcategoriaIds = searchParams.getAll("subcategoriaIds[]").length > 0
            ? searchParams.getAll("subcategoriaIds[]")
            : searchParams.getAll("subcategoriaIds") || [];
        const llenos = searchParams.get("llenos");
        const propios = searchParams.get("propios");
        console.log(`[GET /api/bi/cilindros] subcategoriaIds:`, subcategoriaIds, "llenos:", llenos, "propios:", propios);

        // 4. Query base
        let query = {};
        if (subcategoriaIds.length > 0) {
            // Asegúrate de convertir los ids a ObjectId si corresponde
            query["categorias.subcategorias.subcategoriaCatalogoId"] = { $nin: subcategoriaIds };
        }
        console.log("[GET /api/bi/cilindros] Query selector:", JSON.stringify(query));

        // 5. Buscar cilindros
        let cilindros = await BICilindro.find(query)
            .populate("clienteId")
            .populate("direccionId")
            .populate("categorias.categoriaCatalogoId")
            .populate("categorias.subcategorias.subcategoriaCatalogoId")
            .lean();
        console.log(`[GET /api/bi/cilindros] cilindros encontrados: ${cilindros.length}`);

        // 6. Marcar propios y filtrar por llenos/vacios
        
        // Filtrar cilindros propios
        cilindros = cilindros.filter(c => 
            propios ? !direccionIdsPropias.includes(c.direccionId.toString())
            : direccionIdsPropias.includes(c.direccionId.toString())
        );
        console.log(`[GET /api/bi/cilindros] Filtrado por propios: ${cilindros.length} resultados`);

        if (llenos !== null) {
            const llenosBool = llenos === "true";
            cilindros = cilindros.filter(c => c.llenos > 0 === llenosBool);
            console.log(`[GET /api/bi/cilindros] Filtrado por llenos=${llenos}: ${cilindros.length} resultados`);
        }

        return NextResponse.json({
            ok: true,
            cilindros
        });
    } catch (err) {
        console.error("[GET /api/bi/cilindros] Error:", err);
        return NextResponse.json({
            ok: false,
            error: "Internal Server Error"
        }, { status: 500 });
    }
}