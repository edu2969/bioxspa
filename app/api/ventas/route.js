import { getSupabaseServerClient } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { withAuthorization } from "@/lib/auth/apiAuthorization";
import { TIPO_ESTADO_VENTA, TIPO_CARGO } from "@/app/utils/constants";

export const POST = withAuthorization(
  async (req, user) => {
    try {
      const body = await req.json();
      const supabase = await getSupabaseServerClient();

      const payload = {
        tipo: body.tipo,
        usuarioId: body.usuarioId,
        clienteId: body.clienteId,
        documentoTributarioId: body.documentoTributarioId,
        direccionDespachoId: body.direccionDespachoId,
        sucursalId: body.sucursalId,
        empresaDondeRetirarId: body.empresaDondeRetirarId,
        motivoTraslado: body.motivoTraslado,
        comentario: body.comentario,
        items: (body.items || []).map((item) => ({
          cantidad: item.cantidad,
          subcategoriaId: item.subcategoriaId
        }))
      };

      // Obtener contexto de cargo activo para dependencia/sucursal.
      const { data: cargoActivo } = await supabase
        .from("cargos")
        .select("dependencia_id, sucursal_id")
        .eq("usuario_id", user.id)
        .eq("activo", true)
        .is("hasta", null)
        .limit(1)
        .maybeSingle();
      
      const requiredFields = ["tipo", "usuarioId"];
      const esAdmin = user.cargos.some((cargoTipo) =>
        [TIPO_CARGO.cobranza, TIPO_CARGO.gerente, TIPO_CARGO.responsable]
            .includes(cargoTipo)
      );

      if (body.tipo === 1 || body.tipo === 4) {
        requiredFields.push("clienteId", "items");
        if (esAdmin && body.tipo === 1) {
          requiredFields.push("documentoTributarioId");
        }
      } else if (body.tipo === 2) {
        requiredFields.push("motivoTraslado", "empresaDondeRetirarId", "direccionDespachoId");
      }

      for (const field of requiredFields) {
        if (!payload[field] || (Array.isArray(payload[field]) && payload[field].length === 0)) {
          const errorMessage = `Field '${field}' is required and cannot be empty`;
          console.error("Validation Error:", errorMessage);
          return NextResponse.json({ error: errorMessage }, { status: 400 });
        }
      }

      if (payload.tipo === 1 || payload.tipo === 4) {
        for (const item of payload.items) {
          if (!item.cantidad || !item.subcategoriaId) {
            const errorMessage = "Each item must have 'cantidad' and 'subcategoriaId'";
            console.error("Validation Error:", errorMessage);
            return NextResponse.json({ error: errorMessage }, { status: 400 });
          }
        }
      }

      const { data: cliente, error: clienteError } = await supabase
        .from("clientes")
        .select("id, arriendo")
        .eq("id", payload.tipo === 1 || payload.tipo === 4 ? payload.clienteId : payload.empresaDondeRetirarId)
        .single();

      if (clienteError || !cliente) {
        console.error("Cliente not found:", clienteError?.message);
        return NextResponse.json({ error: "Cliente not found" }, { status: 404 });
      }

      const { data: precios, error: preciosError } = await supabase
        .from("precios")
        .select("id, cliente_id, valor, subcategoria_catalogo_id")
        .eq("cliente_id", payload.clienteId);

      if (preciosError) {
        console.error("Error fetching precios:", preciosError.message);
        return NextResponse.json({ error: "Error fetching precios" }, { status: 500 });
      }

      // Verificar que los precios estén cargados correctamente
      const preciosMap = precios.reduce((map, precio) => {
        const subcategoriaKey = precio.subcategoria_id || precio.subcategoria_catalogo_id;
        if (subcategoriaKey) {
          map[subcategoriaKey] = precio.valor;
        }
        return map;
      }, {});

      // Calcular valores netos, IVA y totales
      const valorNeto = payload.items.reduce((total, item) => {
        const precio = preciosMap[item.subcategoriaId] || 0;
        return total + item.cantidad * precio;
      }, 0);

      const valorIVA = valorNeto * 0.19;
      const valorTotal = valorNeto + valorIVA;

      const estadoInicial =
        payload.tipo === 1 && esAdmin
          ? TIPO_ESTADO_VENTA.por_asignar
          : TIPO_ESTADO_VENTA.borrador;          

      const { data: nuevaVenta, error: ventaError } = await supabase
        .from("ventas")
        .insert({
          tipo: payload.tipo,
          cliente_id: payload.clienteId,
          vendedor_id: payload.usuarioId,
          sucursal_id: payload.sucursalId || cargoActivo?.sucursal_id || null,
          dependencia_id: cargoActivo?.dependencia_id || null,
          fecha: new Date().toISOString(),
          estado: estadoInicial,
          valor_neto: valorNeto,
          valor_iva: valorIVA,
          valor_total: valorTotal,
          saldo: valorTotal,
          documento_tributario_id: payload.documentoTributarioId,
          direccion_despacho_id: payload.direccionDespachoId || null,
          comentario: payload.comentario || "",
        })
        .select();

      if (ventaError || !nuevaVenta) {
        console.error("Error al crear la venta:", ventaError?.message);
        return NextResponse.json({ error: "Error al crear la venta" }, { status: 500 });
      }      

      // Cambiar el map de detalles para asegurar que nuevaVenta.id sea leído correctamente
      const detalles = payload.items.map((item) => ({
        venta_id: nuevaVenta[0].id, // Asegurarse de acceder al primer elemento si nuevaVenta es un array
        subcategoria_id: item.subcategoriaId,
        cantidad: item.cantidad,
        neto: (preciosMap[item.subcategoriaId] || 0) * item.cantidad,
        iva: (preciosMap[item.subcategoriaId] || 0) * item.cantidad * 0.19,
        total: (preciosMap[item.subcategoriaId] || 0) * item.cantidad * 1.19,
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
          estado: estadoInicial
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
    allowedRoles: [TIPO_CARGO.cobranza, TIPO_CARGO.gerente, TIPO_CARGO.responsable],
    requireContext: true
  }
);
