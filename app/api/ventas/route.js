import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { withAuthorization } from "@/lib/auth/apiAuthorization";
import { TIPO_ESTADO_VENTA, ROLES } from "@/app/utils/constants";

export const POST = withAuthorization(
  async (req, user) => {
    try {
      const body = await req.json();

      const requiredFields = ["tipo", "usuario_id"];
      const esAdmin = user.roles.some((role) =>
        [ROLES.COLLECTIONS, ROLES.MANAGER, ROLES.SUPERVISOR]
            .includes(role)
      );

      if (body.tipo === 1 || body.tipo === 4) {
        requiredFields.push("cliente_id", "items");
        if (esAdmin && body.tipo === 1) {
          requiredFields.push("documento_tributario_id");
        }
      } else if (body.tipo === 2) {
        requiredFields.push("motivo_traslado", "empresa_donde_retirar_id", "direccion_despacho_id");
      }

      for (const field of requiredFields) {
        if (!body[field] || (Array.isArray(body[field]) && body[field].length === 0)) {
          const errorMessage = `Field '${field}' is required and cannot be empty`;
          console.error("Validation Error:", errorMessage);
          return NextResponse.json({ error: errorMessage }, { status: 400 });
        }
      }

      if (body.tipo === 1 || body.tipo === 4) {
        for (const item of body.items) {
          if (!item.cantidad || !item.subcategoria_id) {
            const errorMessage = "Each item must have 'cantidad' and 'subcategoria_id'";
            console.error("Validation Error:", errorMessage);
            return NextResponse.json({ error: errorMessage }, { status: 400 });
          }
        }
      }

      const { data: cliente, error: clienteError } = await supabase
        .from("clientes")
        .select("id, arriendo")
        .eq("id", body.tipo === 1 || body.tipo === 4 ? body.cliente_id : body.empresa_donde_retirar_id)
        .single();

      if (clienteError || !cliente) {
        console.error("Cliente not found:", clienteError?.message);
        return NextResponse.json({ error: "Cliente not found" }, { status: 404 });
      }

      const { data: precios, error: preciosError } = await supabase
        .from("precios")
        .select("id, cliente_id, valor, subcategoria_catalogo_id")
        .eq("cliente_id", body.cliente_id);

      if (preciosError) {
        console.error("Error fetching precios:", preciosError.message);
        return NextResponse.json({ error: "Error fetching precios" }, { status: 500 });
      }

      // Verificar que los precios estén cargados correctamente
      const preciosMap = precios.reduce((map, precio) => {
        map[precio.subcategoria_catalogo_id] = precio.valor;
        return map;
      }, {});

      // Calcular valores netos, IVA y totales
      const valorNeto = body.items.reduce((total, item) => {
        const precio = preciosMap[item.subcategoria_id] || 0;
        return total + item.cantidad * precio;
      }, 0);

      const valorIVA = valorNeto * 0.19;
      const valorTotal = valorNeto + valorIVA;

      const estadoInicial =
        body.tipo === 1 && esAdmin
          ? TIPO_ESTADO_VENTA.por_asignar
          : TIPO_ESTADO_VENTA.borrador;          

      const { data: nuevaVenta, error: ventaError } = await supabase
        .from("ventas")
        .insert({
          tipo: body.tipo,
          cliente_id: body.cliente_id,
          vendedor_id: body.usuario_id,
          sucursal_id: body.sucursal_id,
          dependencia_id: user.context.dependenciaId || null,
          fecha: new Date().toISOString(),
          estado: estadoInicial,
          valor_neto: valorNeto,
          valor_iva: valorIVA,
          valor_total: valorTotal,
          saldo: valorTotal,
          documento_tributario_id: body.documento_tributario_id,
          direccion_despacho_id: body.direccion_despacho_id || null,
          comentario: body.comentario || "",
        })
        .select();

      if (ventaError || !nuevaVenta) {
        console.error("Error al crear la venta:", ventaError?.message);
        return NextResponse.json({ error: "Error al crear la venta" }, { status: 500 });
      }      

      // Cambiar el map de detalles para asegurar que nuevaVenta.id sea leído correctamente
      const detalles = body.items.map((item) => ({
        venta_id: nuevaVenta[0].id, // Asegurarse de acceder al primer elemento si nuevaVenta es un array
        subcategoria_id: item.subcategoria_id,
        cantidad: item.cantidad,
        neto: preciosMap[item.subcategoria_id] * item.cantidad,
        iva: preciosMap[item.subcategoria_id] * item.cantidad * 0.19,
        total: preciosMap[item.subcategoria_id] * item.cantidad * 1.19,
      }));

      const { error: detalleError } = await supabase
        .from("detalle_ventas")
        .insert(detalles);

      if (detalleError) {
        console.error("Error al crear los detalles de la venta:", detalleError.message);
        return NextResponse.json({ error: "Error al crear los detalles de la venta" }, { status: 500 });
      }

      // Insertar el estado inicial en la tabla venta_historial_estados
      const { error: historialError } = await supabase
        .from("venta_historial_estados")
        .insert({
          venta_id: nuevaVenta[0].id,
          estado: estadoInicial,
          fecha: new Date().toISOString(),
        });

      if (historialError) {
        console.error("Error al insertar el historial de estados:", historialError.message);
        return NextResponse.json({ error: "Error al insertar el historial de estados" }, { status: 500 });
      }

      return NextResponse.json({ ok: true, venta: nuevaVenta[0] });
    } catch (error) {
      console.error("Error processing venta:", error);
      return NextResponse.json({ error: String(error) }, { status: 500 });
    }
  },
  {
    resource: "pedidos",
    action: "create",
    allowedRoles: [ROLES.COLLECTIONS],
    requireContext: true,
  }
);
