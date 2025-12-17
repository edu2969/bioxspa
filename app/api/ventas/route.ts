import { connectMongoDB } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";
import { TIPO_ESTADO_VENTA, USER_ROLE } from "@/app/utils/constants";
import Venta from "@/models/venta";
import Cliente from "@/models/cliente";
import DetalleVenta from "@/models/detalleVenta";
import Precio from "@/models/precio";
import Cargo from "@/models/cargo";
import Dependencia from "@/models/dependencia";

export async function POST(req: NextRequest) {
    try {
        await connectMongoDB();
        const body = await req.json();

        console.log("BODY 2", body);

        const requiredFields = [
            "tipo",
            "usuarioId"
        ];

        const session = await getServerSession(authOptions);
        if (!session || !session.user || !session.user.id) {
            console.warn("Unauthorized access attempt.");
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const esAdmin = session.user.role === USER_ROLE.gerente
            || session.user.role === USER_ROLE.encargado
            || session.user.role === USER_ROLE.cobranza;

        if (body.tipo == 1 || body.tipo == 4) {
            requiredFields.push("clienteId", "items");
            if (esAdmin && body.tipo == 1) {
                requiredFields.push("documentoTributarioId");
            }
            if (!esAdmin) {
                console.log("No es admin, asignando documentoTributarioId desde cliente");
                const cliente = await Cliente.findById(body.clienteId);
                console.log("Cliente encontrado:", cliente);
                body.documentoTributarioId = cliente ? cliente.documentoTributarioId : null;
                console.log("Documento tributario asignado:", cliente.documentoTributarioId);
            }
        } else if (body.tipo == 2) {
            requiredFields.push("motivoTraslado", "empresaDondeRetirarId", "direccionRetiroId");
        } else if (body.tipo == 3) {
            // TODO Orden de traslado - empresaOrigenId, direccionOrigenId, empresaDestinoId, direccionDespacho, razón traslado, items
        }


        for (const field of requiredFields) {
            if (!body[field] || (Array.isArray(body[field]) && body[field].length === 0)) {
                const errorMessage = `Field '${field}' is required and cannot be empty`;
                console.error("Validation Error:", errorMessage);
                return NextResponse.json({ error: errorMessage }, { status: 400 });
            }
        }

        if (body.tipo == 1 || body.tipo == 4) {
            for (const item of body.items) {
                if (!item.cantidad || !item.subcategoriaId) {
                    const errorMessage = "Each item must have 'cantidad' and 'subcategoriaId'";
                    console.error("Validation Error:", errorMessage);
                    return NextResponse.json({ error: errorMessage }, { status: 400 });
                }
            }
        }

        const precios = await Precio.find({
            clienteId: body.clienteId,
            subcategoriaCatalogoId: { $in: body.items.map((i: { subcategoriaId: string }) => i.subcategoriaId) }
        }).lean();

        const valorNeto = body.tipo == 1 || body.tipo == 4 ?
            body.items.reduce((total: number, item: { clienteId: string, subcategoriaId: string, cantidad: number }) => {
                const precioObj = precios.find((p) => String(p.subcategoriaCatalogoId) === item.subcategoriaId);
                console.log("precioObj", precioObj);
                const precio = precioObj ? precioObj.valor : 0;
                return total + (item.cantidad * precio);
            }, 0) : 0;

        const cliente = await Cliente.findById(body.tipo == 1 || body.tipo == 4 ? body.clienteId : body.empresaDondeRetirarId);
        if (!cliente) {
            const errorMessage = "Cliente not found";
            console.error("Validation Error:", errorMessage);
            return NextResponse.json({ error: errorMessage }, { status: 404 });
        }

        if (!body.sucursalId) {
            const cargo = await Cargo.findOne({ userId: session.user.id });
            if (!cargo) {
                const errorMessage = "Usuario no tiene cargo activo";
                console.error("Validation Error:", errorMessage);
                return NextResponse.json({ error: errorMessage }, { status: 400 });
            }
            if (!cargo.sucursalId) {
                const dependencia = await Dependencia.findById(cargo.dependenciaId);
                if (!dependencia) {
                    const errorMessage = "Usuario no tiene dependencia asignada";
                    console.error("Validation Error:", errorMessage);
                    return NextResponse.json({ error: errorMessage }, { status: 400 });
                }
                body.sucursalId = dependencia.sucursalId;
            } else body.sucursalId = cargo.sucursalId;
        }

        if (body.tipo == 1 || body.tipo == 4) {
            const tieneArriendo = cliente.arriendo;
            const estadoInicial = (body.tipo == 1 && (session.user.role == USER_ROLE.gerente
                || session.user.role == USER_ROLE.cobranza
                || session.user.role == USER_ROLE.encargado))
                ? TIPO_ESTADO_VENTA.por_asignar : TIPO_ESTADO_VENTA.borrador;
            const nuevaVenta = new Venta({
                tipo: body.tipo,
                clienteId: body.clienteId,
                vendedorId: body.usuarioId,
                sucursalId: body.sucursalId,
                dependenciaId: body.dependenciaId || null,
                fecha: new Date(),
                estado: estadoInicial,
                valorNeto,
                valorIva: valorNeto * 0.19,
                valorBruto: valorNeto * (1 - 0.19),
                valorTotal: valorNeto * 1.19,
                documentoTributarioId: body.documentoTributarioId,
                porCobrar: false,
                tieneArriendo,
                direccionDespachoId: body.direccionDespachoId == "" ? null : body.direccionDespachoId || null,
                comentario: body.comentario || "",
                historialEstados: [{
                    estado: estadoInicial,
                    fecha: new Date(),
                }]
            });

            const savedVenta = await nuevaVenta.save();

            for (const item of body.items) {
                const valor = precios.find((p) => String(p.subcategoriaCatalogoId) === item.subcategoriaId)?.valor ?? 0;
                const detalleVenta = new DetalleVenta({
                    ventaId: savedVenta._id,
                    subcategoriaCatalogoId: item.subcategoriaId || null,
                    itemsCatalogoId: item.itemCategoriaId || null,
                    cantidad: item.cantidad,
                    neto: item.cantidad * valor,
                    iva: item.cantidad * valor * 0.19,
                    total: item.cantidad * valor * 1.19
                });
                await detalleVenta.save();

                const precioExistente = await Precio.findOne({
                    subcategoriaCatalogoId: item.subcategoriaId,
                    clienteId: body.clienteId
                });

                if (precioExistente) {
                    if (precioExistente.valor !== valor) {
                        const varianza = valor - precioExistente.valor;
                        precioExistente.historial.push({
                            valor: valor,
                            fecha: new Date(),
                            varianza
                        });
                        precioExistente.valor = valor;
                        await precioExistente.save();
                    }
                } else if (item.precio > 0) {
                    const nuevoPrecio = new Precio({
                        subcategoriaCatalogoId: item.subcategoriaId,
                        clienteId: body.clienteId,
                        valorBruto: valor,
                        impuesto: valor * 0.19,
                        moneda: "CLP",
                        valor: valor,
                        historial: [{
                            valor: valor,
                            fecha: new Date(),
                            varianza: 0
                        }],
                        fechaDesde: new Date()
                    });
                    await nuevoPrecio.save();
                }
            }
            return NextResponse.json({ ok: true, venta: savedVenta });
        } else if (body.tipo == 2) {
            const nuevaVenta = new Venta({
                tipo: body.tipo,
                sucursalId: body.sucursalId,
                dependenciaId: body.dependenciaId || null,
                vendedorId: body.usuarioId,
                fecha: new Date(),
                estado: TIPO_ESTADO_VENTA.por_asignar,
                historialEstados: [{
                    estado: TIPO_ESTADO_VENTA.por_asignar,
                    fecha: new Date(),
                }],
                motivoTraslado: body.motivoTraslado,
                clienteId: body.empresaDondeRetirarId,
                direccionDespachoId: body.direccionRetiroId,
                comentario: body.comentario || ""
            });
            const savedVenta = await nuevaVenta.save();
            return NextResponse.json({ ok: true, venta: savedVenta });
        }
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Error processing venta:", error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
