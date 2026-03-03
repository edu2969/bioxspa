import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { TIPO_ESTADO_VENTA, ROLES, TIPO_ESTADO_RUTA_DESPACHO } from "@/app/utils/constants";

const getEstadoVentaNombre = (estado) => {
  const estadosMap = {
    [TIPO_ESTADO_VENTA.borrador]: "Borrador",
    [TIPO_ESTADO_VENTA.por_asignar]: "Por asignar",
    [TIPO_ESTADO_VENTA.cotizacion]: "Cotización",
    [TIPO_ESTADO_VENTA.ot]: "Orden de trabajo",
    [TIPO_ESTADO_VENTA.preparacion]: "Preparación",
    [TIPO_ESTADO_VENTA.reparto]: "En reparto",
    [TIPO_ESTADO_VENTA.entregado]: "Entregado",
    [TIPO_ESTADO_VENTA.rechazado]: "Rechazado",
    [TIPO_ESTADO_VENTA.anulado]: "Anulado",
    [TIPO_ESTADO_VENTA.pagado]: "Pagado",
    [TIPO_ESTADO_VENTA.cerrado]: "Cerrado"
  };
  return estadosMap[estado] || `Estado ${estado}`;
};

const getEstadoRutaNombre = (estado) => {
  const estadosMap = {
    [TIPO_ESTADO_RUTA_DESPACHO.preparacion]: "Preparación",
    [TIPO_ESTADO_RUTA_DESPACHO.orden_cargada]: "Orden cargada",
    [TIPO_ESTADO_RUTA_DESPACHO.orden_confirmada]: "Orden confirmada",
    [TIPO_ESTADO_RUTA_DESPACHO.checklist_vehiculo]: "Checklist vehículo",
    [TIPO_ESTADO_RUTA_DESPACHO.seleccion_destino]: "Selección destino",
    [TIPO_ESTADO_RUTA_DESPACHO.en_ruta]: "En ruta",
    [TIPO_ESTADO_RUTA_DESPACHO.descarga]: "Descarga",
    [TIPO_ESTADO_RUTA_DESPACHO.descarga_confirmada]: "Descarga confirmada",
    [TIPO_ESTADO_RUTA_DESPACHO.carga]: "Carga",
    [TIPO_ESTADO_RUTA_DESPACHO.carga_confirmada]: "Carga confirmada",
    [TIPO_ESTADO_RUTA_DESPACHO.retirado]: "Retirado",
    [TIPO_ESTADO_RUTA_DESPACHO.regreso]: "Regreso",
    [TIPO_ESTADO_RUTA_DESPACHO.regreso_confirmado]: "Regreso confirmado",
    [TIPO_ESTADO_RUTA_DESPACHO.terminado]: "Terminado",
    [TIPO_ESTADO_RUTA_DESPACHO.cancelado]: "Cancelado",
    [TIPO_ESTADO_RUTA_DESPACHO.a_reasignar]: "A reasignar",
    [TIPO_ESTADO_RUTA_DESPACHO.anulado]: "Anulado"
  };
  return estadosMap[estado] || `Estado ${estado}`;
};

const calcularDuracion = (fechaActual, fechaSiguiente) => {
  const diff = fechaSiguiente ?
    fechaSiguiente.getTime() - fechaActual.getTime() :
    Date.now() - fechaActual.getTime();

  return Math.round(diff / 1000);
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const ventaId = searchParams.get("ventaId");
  if (!ventaId) {
    return NextResponse.json({ error: "Falta el parámetro 'ventaId'" }, { status: 400 });
  }

  console.log("VENTA ID RECIBIDA:", ventaId);

  const { data: venta, error: ventaError } = await supabase
    .from("ventas")
    .select(`
      *,
      historialEstados:venta_historial_estados(*),
      rutas: ruta_despacho_ventas(
        rutas_despacho(*, destinos: ruta_despacho_destinos(direccion: direcciones(direccion_cliente)))
      )
    `)
    .eq("id", ventaId)
    .single();

  if (ventaError || !venta) {
    console.log("Error fetching venta:", ventaError);
    return NextResponse.json({ error: "Venta no encontrada" }, { status: 404 });
  }

  const historialVenta = venta.historialEstados?.map((he, index) => {
    const fechaSiguiente = index < (venta.historialEstados?.length || 0) - 1 ?
      venta.historialEstados?.[index + 1]?.created_at : undefined;

    return {
      estado: he.estado,
      fecha: he.created_at,
      duracion: calcularDuracion(new Date(he.created_at), fechaSiguiente ? new Date(fechaSiguiente) : undefined),
      titulo: getEstadoVentaNombre(he.estado),
      subtitulo: "Estado de venta",
      descripcion: 'Estado relacionado con la venta'
    };
  }) || [];

  const historialRuta = venta.rutas?.flatMap((ruta) =>
    ruta.rutas_despacho?.historialEstado?.map((he, index) => {
      const fechaSiguiente = index < (ruta.rutas_despacho.historialEstado?.length || 0) - 1 ?
        ruta.rutas_despacho.historialEstado?.[index + 1]?.created_at : undefined;

      const direccionDestino = ruta.rutas_despacho.destinos?.[0]?.direccion?.direccion_cliente || "Sin dirección registrada";

      return {
        estado: he.estado,
        fecha: he.created_at,
        duracion: calcularDuracion(new Date(he.created_at), fechaSiguiente ? new Date(fechaSiguiente) : undefined),
        titulo: getEstadoRutaNombre(he.estado),
        subtitulo: "Estado de ruta",
        descripcion: direccionDestino
      };
    }) || []
  ) || [];

  const historial = [...historialVenta, ...historialRuta]
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

  return NextResponse.json({ historial });
}

export async function POST(req) {
  try {
    const body = await req.json();

    const requiredFields = ["tipo", "usuario_id"];
    const esAdmin = user.roles.some((role) =>
      [ROLES.COLLECTIONS, ROLES.MANAGER, ROLES.SUPERVISOR].includes(role)
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

    const preciosMap = precios.reduce((map, precio) => {
      map[precio.subcategoria_catalogo_id] = precio.valor;
      return map;
    }, {});

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

    const detalles = body.items.map((item) => ({
      venta_id: nuevaVenta[0].id,
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

    const { error: historialError } = await supabase
      .from("venta_historial_estados")
      .insert({
        venta_id: nuevaVenta[0].id,
        estado: estadoInicial,
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
}
