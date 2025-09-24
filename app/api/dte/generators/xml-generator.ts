import { DTETest } from '../casos-test';

export class XMLGenerator {
  
  static generarFacturaElectronica(data: DTETest): string {
    const { items, receptor, descuentoGlobal } = data;
    
    // Calcular totales
    const itemsAfectos = items.filter(item => item.afecto);
    const itemsExentos = items.filter(item => !item.afecto);
    
    const subtotalAfecto = itemsAfectos.reduce((sum, item) => sum + item.montoItem, 0);
    const subtotalExento = itemsExentos.reduce((sum, item) => sum + item.montoItem, 0);
    
    // Aplicar descuento global si existe
    let descuentoTotal = 0;
    if (descuentoGlobal && descuentoGlobal.sobreAfectos) {
      descuentoTotal = descuentoGlobal.tipo === 'P' 
        ? Math.round(subtotalAfecto * (descuentoGlobal.valor / 100))
        : descuentoGlobal.valor;
    }
    
    const neto = subtotalAfecto - descuentoTotal;
    const iva = Math.round(neto * 0.19);
    const total = neto + iva + subtotalExento;

    return `<?xml version="1.0" encoding="ISO-8859-1"?>
<DTE version="1.0">
  <Documento ID="F${data.folio}T${data.tipoDTE}">
    <Encabezado>
      <IdDoc>
        <TipoDTE>${data.tipoDTE}</TipoDTE>
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
        ${neto > 0 ? `<MntNeto>${neto}</MntNeto>` : ''}
        ${subtotalExento > 0 ? `<MntExe>${subtotalExento}</MntExe>` : ''}
        ${iva > 0 ? `<IVA>${iva}</IVA>` : ''}
        <MntTotal>${total}</MntTotal>
      </Totales>
    </Encabezado>
    ${items.map((item) => `
    <Detalle>
      <NroLinDet>${item.nroLinDet}</NroLinDet>
      <NmbItem>${item.nombre}</NmbItem>
      <QtyItem>${item.cantidad}</QtyItem>
      ${item.unidadMedida ? `<UnmdItem>${item.unidadMedida}</UnmdItem>` : ''}
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
    ${data.referencia ? `
    <Referencia>
      <NroLinRef>${data.referencia.nroLinRef}</NroLinRef>
      <TpoDocRef>${data.referencia.tipoDTE}</TpoDocRef>
      <FolioRef>${data.referencia.folio}</FolioRef>
      <FchRef>${data.referencia.fechaDocRef}</FchRef>
      <CodRef>${data.referencia.codRef}</CodRef>
      <RazonRef>${data.referencia.razonRef}</RazonRef>
    </Referencia>` : ''}
  </Documento>
</DTE>`;
  }

  static generarFacturaExenta(data: DTETest): string {
    const { items, receptor } = data;
    const total = items.reduce((sum, item) => sum + item.montoItem, 0);

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
        <MntExe>${total}</MntExe>
        <MntTotal>${total}</MntTotal>
      </Totales>
    </Encabezado>
    ${items.map(item => `
    <Detalle>
      <NroLinDet>${item.nroLinDet}</NroLinDet>
      <NmbItem>${item.nombre}</NmbItem>
      <QtyItem>${item.cantidad}</QtyItem>
      ${item.unidadMedida ? `<UnmdItem>${item.unidadMedida}</UnmdItem>` : ''}
      <PrcItem>${item.precioUnitario}</PrcItem>
      <MontoItem>${item.montoItem}</MontoItem>
    </Detalle>`).join('')}
    ${data.referencia ? `
    <Referencia>
      <NroLinRef>${data.referencia.nroLinRef}</NroLinRef>
      <TpoDocRef>${data.referencia.tipoDTE}</TpoDocRef>
      <FolioRef>${data.referencia.folio}</FolioRef>
      <FchRef>${data.referencia.fechaDocRef}</FchRef>
      <CodRef>${data.referencia.codRef}</CodRef>
      <RazonRef>${data.referencia.razonRef}</RazonRef>
    </Referencia>` : ''}
  </Documento>
</DTE>`;
  }

  static generarGuiaDespacho(data: DTETest): string {
    const { items, receptor } = data;
    const total = items.reduce((sum, item) => sum + item.montoItem, 0);

    return `<?xml version="1.0" encoding="ISO-8859-1"?>
<DTE version="1.0">
  <Documento ID="F${data.folio}T52">
    <Encabezado>
      <IdDoc>
        <TipoDTE>52</TipoDTE>
        <Folio>${data.folio}</Folio>
        <FchEmis>${data.fechaEmision}</FchEmis>
        <IndTraslado>${data.tipoTraslado || 1}</IndTraslado>
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
      ${total > 0 ? `
      <Totales>
        <MntTotal>${total}</MntTotal>
      </Totales>` : ''}
      ${data.transportista ? `
      <Transporte>
        <Transportista>${data.transportista}</Transportista>
      </Transporte>` : ''}
    </Encabezado>
    ${items.map(item => `
    <Detalle>
      <NroLinDet>${item.nroLinDet}</NroLinDet>
      <NmbItem>${item.nombre}</NmbItem>
      <QtyItem>${item.cantidad}</QtyItem>
      ${item.precioUnitario > 0 ? `<PrcItem>${item.precioUnitario}</PrcItem>` : ''}
      ${item.montoItem > 0 ? `<MontoItem>${item.montoItem}</MontoItem>` : ''}
    </Detalle>`).join('')}
  </Documento>
</DTE>`;
  }
}