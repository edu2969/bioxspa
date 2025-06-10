"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("next/server");
const venta_1 = __importDefault(require("@/models/venta"));
const cliente_1 = __importDefault(require("@/models/cliente"));
const user_1 = __importDefault(require("@/models/user"));
const detalleVenta_1 = __importDefault(require("@/models/detalleVenta"));
const persona_1 = __importDefault(require("@/models/persona"));
const subcategoriaCatalogo_1 = __importDefault(require("@/models/subcategoriaCatalogo"));
const precio_1 = __importDefault(require("@/models/precio"));
const constants_1 = require("@/app/utils/constants");
const mongodb_1 = require("@/lib/mongodb");
// filepath: d:/git/bioxspa/app/api/pedidos/borradores/route.js
async function GET() {
    await (0, mongodb_1.connectMongoDB)();
    // Buscar ventas en estado "borrador"
    const ventas = await venta_1.default.find({ estado: constants_1.TIPO_ESTADO_VENTA.borrador }).lean();
    // Enriquecer ventas
    const pedidos = await Promise.all(ventas.map(async (venta) => {
        const cliente = await cliente_1.default.findById(venta.clienteId).lean();
        const solicitante = await user_1.default.findById(venta.solicitanteId || venta.vendedorId).lean();
        // Obtener teléfono desde Persona si existe
        let telefono = "";
        if (solicitante && solicitante.personaId) {
            const persona = await persona_1.default.findById({ userId: solicitante._id }).lean();
            telefono = (persona === null || persona === void 0 ? void 0 : persona.telefono) || "";
        }
        // Traer detalles de venta
        const detalles = await detalleVenta_1.default.find({ ventaId: venta._id }).lean();
        // Enriquecer detalles con catálogo
        const items = await Promise.all(detalles.map(async (item) => {
            let subcat = null;
            let cat = null;
            if (item.subcategoriaCatalogoId) {
                subcat = await subcategoriaCatalogo_1.default.findById(item.subcategoriaCatalogoId).lean();
                if (subcat && subcat.categoriaCatalogoId) {
                    // Importar aquí para evitar ciclos si es necesario
                    const CategoriaCatalogo = (await Promise.resolve().then(() => __importStar(require('@/models/categoriaCatalogo')))).default;
                    cat = await CategoriaCatalogo.findById(subcat.categoriaCatalogoId).lean();
                }
            }
            return {
                producto: (cat && subcat) ? `${cat.nombre} - ${subcat.nombre}` : "",
                capacidad: (subcat === null || subcat === void 0 ? void 0 : subcat.cantidad) ? `${subcat.cantidad} ${subcat.unidad || ""}`.trim() : "",
                cantidad: item.cantidad,
                precio: item.neto || undefined,
            };
        }));
        return {
            _id: venta._id.toString(),
            cliente: cliente
                ? { nombre: cliente.nombre, rut: cliente.rut }
                : { nombre: "Sin cliente", rut: "" },
            solicitante: solicitante
                ? {
                    _id: solicitante._id.toString(),
                    nombre: solicitante.name || solicitante.nombre || "",
                    telefono,
                }
                : { _id: "", nombre: "", telefono: "" },
            fecha: venta.fecha || venta.createdAt,
            items,
        };
    }));
    return server_1.NextResponse.json({ pedidos });
}
async function POST(request) {
    await (0, mongodb_1.connectMongoDB)();
    console.log("Conexión a MongoDB establecida en POST /borradores");
    const body = await request.json();
    console.log("Body recibido:", body);
    const { ventaId, precios, eliminar } = body;
    if (!ventaId) {
        console.warn("Falta ventaId en la solicitud");
        return server_1.NextResponse.json({ ok: false, error: "Falta ventaId" }, { status: 400 });
    }
    const venta = await venta_1.default.findById(ventaId);
    if (!venta) {
        console.warn(`Venta no encontrada: ${ventaId}`);
        return server_1.NextResponse.json({ ok: false, error: "Venta no encontrada" }, { status: 404 });
    }
    if (eliminar) {
        // Anular venta
        venta.estado = constants_1.TIPO_ESTADO_VENTA.anulado;
        await venta.save();
        console.log(`Venta ${ventaId} anulada`);
        return server_1.NextResponse.json({ ok: true, estado: "anulado" });
    }
    if (!Array.isArray(precios) || precios.length === 0) {
        console.warn("No se enviaron precios");
        return server_1.NextResponse.json({ ok: false, error: "Debe enviar precios" }, { status: 400 });
    }
    // Guardar precios para el cliente
    for (const { subcategoriaId, precio } of precios) {
        if (!subcategoriaId || !precio) {
            console.warn("Precio o subcategoriaId faltante en item:", { subcategoriaId, precio });
            continue;
        }
        // Buscar si ya existe un precio para este cliente y subcategoria
        let precioDoc = await precio_1.default.findOne({
            clienteId: venta.clienteId,
            subcategoriaCatalogoId: subcategoriaId,
        });
        if (precioDoc) {
            // Actualizar historial y valor
            precioDoc.historial.push({
                valor: precio,
                fecha: new Date(),
                varianza: precio - precioDoc.valor,
            });
            precioDoc.valor = precio;
            precioDoc.valorBruto = precio;
            precioDoc.fechaDesde = new Date();
            await precioDoc.save();
            console.log(`Precio actualizado para cliente ${venta.clienteId}, subcategoria ${subcategoriaId}: ${precio}`);
        }
        else {
            // Crear nuevo precio
            await precio_1.default.create({
                clienteId: venta.clienteId,
                subcategoriaCatalogoId: subcategoriaId,
                valor: precio,
                valorBruto: precio,
                impuesto: 0,
                moneda: "CLP",
                historial: [{
                        valor: precio,
                        fecha: new Date(),
                        varianza: 0,
                    }],
                fechaDesde: new Date(),
            });
            console.log(`Precio creado para cliente ${venta.clienteId}, subcategoria ${subcategoriaId}: ${precio}`);
        }
    }
    // Cambiar estado a "por_asignar"
    venta.estado = constants_1.TIPO_ESTADO_VENTA.por_asignar;
    await venta.save();
    console.log(`Venta ${ventaId} cambiada a estado 'por_asignar'`);
    return server_1.NextResponse.json({ ok: true, estado: "por_asignar" });
}
