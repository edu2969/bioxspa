import { NextRequest } from 'next/server';
import { FacturaElectronica } from '../../types/factura';

export const runtime = 'nodejs';

// Casos de test del SII
export const CASOS_TEST = {
  "4444651-1": {
    tipoDTE: 33,
    folio: 1,
    fechaEmision: "2024-01-15",
    receptor: {
      rut: "96790240-3",
      razonSocial: "SERVICIO DE IMPUESTOS INTERNOS",
      giro: "ADMINISTRACION PUBLICA",
      direccion: "TEATINOS 120",
      comuna: "SANTIAGO",
      ciudad: "SANTIAGO"
    },
    items: [
      {
        nroLinDet: 1,
        nombre: "Cajón AFECTO",
        cantidad: 132,
        precioUnitario: 1396,
        montoItem: 132 * 1396,
        afecto: true
      },
      {
        nroLinDet: 2,
        nombre: "Relleno AFECTO",
        cantidad: 56,
        precioUnitario: 2273,
        montoItem: 56 * 2273,
        afecto: true
      }
    ]
  },
  "4444651-2": {
    tipoDTE: 33,
    folio: 2,
    fechaEmision: "2024-01-15",
    receptor: {
      rut: "96790240-3",
      razonSocial: "SERVICIO DE IMPUESTOS INTERNOS",
      giro: "ADMINISTRACION PUBLICA",
      direccion: "TEATINOS 120",
      comuna: "SANTIAGO",
      ciudad: "SANTIAGO"
    },
    items: [
      {
        nroLinDet: 1,
        nombre: "Pañuelo AFECTO",
        cantidad: 331,
        precioUnitario: 2653,
        descuentoPct: 5,
        montoItem: Math.round((331 * 2653) * 0.95),
        afecto: true
      },
      {
        nroLinDet: 2,
        nombre: "ITEM 2 AFECTO",
        cantidad: 261,
        precioUnitario: 1715,
        descuentoPct: 8,
        montoItem: Math.round((261 * 1715) * 0.92),
        afecto: true
      }
    ]
  }
  // ... más casos
};

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const body: FacturaElectronica = await req.json();

    // Validar estructura
    if (!body.tipoDTE || !body.folio || !body.items?.length) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'Faltan campos obligatorios'
      }), { status: 400 });
    }

    // Generar DTE según tipo
    let xmlDTE: string;
    switch (body.tipoDTE) {
      case 33: // Factura Electrónica
        xmlDTE = await generarFacturaExenta(body);
        break;
      case 34: // Factura Exenta
        xmlDTE = await generarFacturaExenta(body);
        break;
      case 52: // Guía de Despacho
        xmlDTE = await generarGuiaDespacho(body);
        break;
      case 61: // Nota de Crédito
        xmlDTE = await generarNotaCredito(body);
        break;
      case 56: // Nota de Débito
        xmlDTE = await generarNotaDebito(body);
        break;
      default:
        return new Response(JSON.stringify({
          ok: false,
          error: 'Tipo de DTE no soportado'
        }), { status: 400 });
    }

    // Firmar DTE
    const dteFirmado = await firmarDTE(xmlDTE);

    // Enviar al SII (ambiente de certificación)
    const trackId = await enviarAlSII(dteFirmado);

    return new Response(JSON.stringify({
      ok: true,
      trackId,
      xml: dteFirmado
    }), { status: 200 });

  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({
      ok: false,
      error: errorMessage
    }), { status: 500 });
  }
}

async function generarFacturaExenta(data: FacturaElectronica): Promise<string> {
  const { items, receptor, descuentoGlobal } = data;

  // Calcular totales
  const subtotal = items.reduce((sum, item) => sum + item.montoItem, 0);
  const descuentoTotal = descuentoGlobal ?
    (descuentoGlobal.tipo === 'P' ? subtotal * (descuentoGlobal.valor / 100) : descuentoGlobal.valor) : 0;
  const neto = subtotal - descuentoTotal;
  const total = neto; // Factura exenta no lleva IVA

  return `<?xml version="1.0" encoding="ISO-8859-1"?>
<DTE version="1.0">
  <Documento ID="F${data.folio}T34">
    <Encabezado>
      <IdDoc>
        <TipoDTE>34</TipoDTE>
        <Folio>${data.folio}</Folio>
        <FchEmis>${data.fechaEmision}</FchEmis>
      </IdDoc>
      <Emisor>
        <RUTEmisor>12345678-9</RUTEmisor>
        <RznSoc>EMPRESA CERTIFICACION SII</RznSoc>
        <GiroEmis>CERTIFICACION ELECTRONICA</GiroEmis>
        <DirOrigen>DIRECCION EMPRESA</DirOrigen>
        <CmnaOrigen>SANTIAGO</CmnaOrigen>
      </Emisor>
      <Receptor>
        <RUTRecep>${receptor.rut}</RUTRecep>
        <RznSocRecep>${receptor.razonSocial}</RznSocRecep>
        <GiroRecep>${receptor.giro}</GiroRecep>
        <DirRecep>${receptor.direccion}</DirRecep>
        <CmnaRecep>${receptor.comuna}</CmnaRecep>
      </Receptor>
      <Totales>
        <MntExe>${neto}</MntExe>
        <MntTotal>${total}</MntTotal>
      </Totales>
    </Encabezado>
    ${items.map(item => `
    <Detalle>
      <NroLinDet>${item.nroLinDet}</NroLinDet>
      <NmbItem>${item.nombre}</NmbItem>
      <QtyItem>${item.cantidad}</QtyItem>
      <PrcItem>${item.precioUnitario}</PrcItem>
      ${item.descuentoPct ? `<DescuentoPct>${item.descuentoPct}</DescuentoPct>` : ''}
      <MontoItem>${item.montoItem}</MontoItem>
    </Detalle>`).join('')}
    ${descuentoGlobal ? `
    <DscRcgGlobal>
      <TpoMov>D</TpoMov>
      <TpoValor>${descuentoGlobal.tipo}</TpoValor>
      <ValorDR>${descuentoGlobal.valor}</ValorDR>
    </DscRcgGlobal>` : ''}
  </Documento>
</DTE>`;
}

async function generarGuiaDespacho(data: FacturaElectronica): Promise<string> {
  const { items, receptor, descuentoGlobal } = data;

  // Calcular totales
  const subtotal = items.reduce((sum, item) => sum + item.montoItem, 0);
  const descuentoTotal = descuentoGlobal ?
    (descuentoGlobal.tipo === 'P' ? subtotal * (descuentoGlobal.valor / 100) : descuentoGlobal.valor) : 0;
  const neto = subtotal - descuentoTotal;
  const iva = Math.round(neto * 0.19);
  const total = neto + iva;

  return `<?xml version="1.0" encoding="ISO-8859-1"?>
<DTE version="1.0">
  <Documento ID="G${data.folio}T52">
    <Encabezado>
      <IdDoc>
        <TipoDTE>52</TipoDTE>
        <Folio>${data.folio}</Folio>
        <FchEmis>${data.fechaEmision}</FchEmis>
      </IdDoc>
      <Emisor>
        <RUTEmisor>12345678-9</RUTEmisor>
        <RznSoc>EMPRESA CERTIFICACION SII</RznSoc>
        <GiroEmis>CERTIFICACION ELECTRONICA</GiroEmis>
        <DirOrigen>DIRECCION EMPRESA</DirOrigen>
        <CmnaOrigen>SANTIAGO</CmnaOrigen>
      </Emisor>
      <Receptor>
        <RUTRecep>${receptor.rut}</RUTRecep>
        <RznSocRecep>${receptor.razonSocial}</RznSocRecep>
        <GiroRecep>${receptor.giro}</GiroRecep>
        <DirRecep>${receptor.direccion}</DirRecep>
        <CmnaRecep>${receptor.comuna}</CmnaRecep>
      </Receptor>
      <Totales>
        <MntNeto>${neto}</MntNeto>
        <IVA>${iva}</IVA>
        <MntTotal>${total}</MntTotal>
      </Totales>
    </Encabezado>
    ${items.map(item => `
    <Detalle>
      <NroLinDet>${item.nroLinDet}</NroLinDet>
      <NmbItem>${item.nombre}</NmbItem>
      <QtyItem>${item.cantidad}</QtyItem>
      <PrcItem>${item.precioUnitario}</PrcItem>
      ${item.descuentoPct ? `<DescuentoPct>${item.descuentoPct}</DescuentoPct>` : ''}
      <MontoItem>${item.montoItem}</MontoItem>
    </Detalle>`).join('')}
    ${descuentoGlobal ? `
    <DscRcgGlobal>
      <TpoMov>D</TpoMov>
      <TpoValor>${descuentoGlobal.tipo}</TpoValor>
      <ValorDR>${descuentoGlobal.valor}</ValorDR>
    </DscRcgGlobal>` : ''}
  </Documento>
</DTE>`;
}

// Elimina las funciones duplicadas y no implementadas
// function generarGuiaDespacho(body: FacturaElectronica): string | PromiseLike<string> {
//   throw new Error('Function not implemented.');
// }

async function firmarDTE(xmlDTE: string): Promise<string> {
  // Simulación de firma digital: en producción usarías una librería de firma XML con certificado
  // Aquí solo agregamos un tag ficticio para indicar que está "firmado"
  return xmlDTE.replace('</Documento>', `
    <Firma>
      <FakeSignature>signed-by-demo-cert</FakeSignature>
    </Firma>
  </Documento>`);
}

// function firmarDTE(xmlDTE: string) {
//   throw new Error('Function not implemented.');
// }

async function enviarAlSII(dteFirmado: string): Promise<string> {
  // Simulación de envío al SII: en producción se haría un POST a la API del SII
  // Aquí simplemente generamos un trackId ficticio
  console.log("Enviando DTE al SII...", dteFirmado.substring(0, 5) + '...'); // Log parcial del DTE
  const trackId = 'TRACK-' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  // Simular latencia de red
  await new Promise(resolve => setTimeout(resolve, 500));
  return trackId;
}

// function enviarAlSII(dteFirmado: string) {
//   throw new Error('Function not implemented.');
// }

// Stub para las funciones faltantes
async function generarNotaCredito(data: FacturaElectronica): Promise<string> {
  console.log("DATA NOTA CREDITO", data);
  // Implementación pendiente
  return '<NotaCredito></NotaCredito>';
}

async function generarNotaDebito(data: FacturaElectronica): Promise<string> {
  console.log("DATA NOTA DEBITO", data);
  // Implementación pendiente
  return '<NotaDebito></NotaDebito>';
}
