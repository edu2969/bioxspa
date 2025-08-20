import { create } from 'xmlbuilder2';
import { EmisionInput } from '../types';

export function buildDTE33XML(input: EmisionInput, ted: string) {
  const { emisor, documento } = input;
  const totalNeto = documento.items.reduce((a, it) => a + Math.round(it.cantidad * it.precio * (1 - (it.descuentoPct||0)/100)), 0);
  const iva = Math.round(totalNeto * 0.19);
  const total = totalNeto + iva;

  const doc = create({ version: '1.0', encoding: 'ISO-8859-1' })
    .ele('DTE', { xmlns: 'http://www.sii.cl/SiiDte', version: '1.0' })
      .ele('Documento', { ID: `DTE-${documento.folio}` })
        .ele('Encabezado')
          .ele('IdDoc')
            .ele('TipoDTE').txt('33').up()
            .ele('Folio').txt(String(documento.folio)).up()
            .ele('FchEmis').txt(documento.fechaEmision).up()
          .up()
          .ele('Emisor')
            .ele('RUTEmisor').txt(`${emisor.rut}-${emisor.dv}`).up()
            .ele('RznSoc').txt('RAZON SOCIAL EMISOR').up()
            .ele('GiroEmis').txt('GIRO EMISOR').up()
            .ele('DirOrigen').txt('DIRECCION EMISOR').up()
            .ele('CmnaOrigen').txt('COMUNA EMISOR').up()
          .up()
          .ele('Receptor')
            .ele('RUTRecep').txt(`${documento.receptor.rut.rut}-${documento.receptor.rut.dv}`).up()
            .ele('RznSocRecep').txt(documento.receptor.razon).up()
            .ele('GiroRecep').txt(documento.receptor.giro||'GIRO RECEPTOR').up()
            .ele('DirRecep').txt(documento.receptor.direccion||'DIRECCION RECEPTOR').up()
            .ele('CmnaRecep').txt(documento.receptor.comuna||'COMUNA RECEPTOR').up()
          .up()
          .ele('Totales')
            .ele('MntNeto').txt(String(totalNeto)).up()
            .ele('IVA').txt(String(iva)).up()
            .ele('MntTotal').txt(String(total)).up()
          .up()
        .up()
        .ele('Detalle')
          // Por simplicidad solo primer ítem visible en XML. En prod agrega todos con .ele('Detalle')...
          .ele('NmbItem').txt(documento.items[0].nombre).up()
          .ele('QtyItem').txt(String(documento.items[0].cantidad)).up()
          .ele('PrcItem').txt(String(documento.items[0].precio)).up()
        .up()
        .ele('TED').txt(ted).up()
      .up()
    .up();

  return doc.end({ prettyPrint: true });
}