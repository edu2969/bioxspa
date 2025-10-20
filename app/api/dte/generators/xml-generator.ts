import { DTETest } from '../casos-test';
import { XMLSigner } from './xml-signer';

export class XMLGenerator {
    static generarYFirmarDTE(caso: DTETest): string {
        console.log(`🔧 Generando XML para caso tipo ${caso.tipoDTE}...`);
        
        // Generar XML básico del DTE
        const xmlDTE = this.generarXMLDTE(caso);
        
        // Firmarlo
        const signer = new XMLSigner();
        const xmlFirmado = signer.firmarXML(xmlDTE);
        
        console.log(`✅ XML generado y firmado para tipo ${caso.tipoDTE}`);
        return xmlFirmado;
    }
    
    private static generarXMLDTE(caso: DTETest): string {
        const fechaEmision = new Date().toISOString().split('T')[0];
        const folio = Math.floor(Math.random() * 1000000) + 1;
        
        // Calcular totales
        const montoNeto = caso.items.reduce((sum, item) => sum + item.montoItem, 0);
        const montoIVA = Math.round(montoNeto * 0.19);
        const montoTotal = montoNeto + montoIVA;
        
        return `<?xml version="1.0" encoding="ISO-8859-1"?>
<DTE version="1.0">
    <Documento ID="DTE-${caso.tipoDTE}-${folio}">
        <Encabezado>
            <IdDoc>
                <TipoDTE>${caso.tipoDTE}</TipoDTE>
                <Folio>${folio}</Folio>
                <FchEmis>${fechaEmision}</FchEmis>
            </IdDoc>
            <Emisor>
                <RUTEmisor>77908357-8</RUTEmisor>
                <RznSoc>GASES BIOBIO SPA</RznSoc>
                <GiroEmis>VENTA DE GASES INDUSTRIALES</GiroEmis>
                <Acteco>251199</Acteco>
                <DirOrigen>AV. BRASIL 2950</DirOrigen>
                <CmnaOrigen>SAN MIGUEL</CmnaOrigen>
                <CiudadOrigen>SANTIAGO</CiudadOrigen>
            </Emisor>
            <Receptor>
                <RUTRecep>${caso.receptor.rut}</RUTRecep>
                <RznSocRecep>${caso.receptor.razonSocial}</RznSocRecep>
                <DirRecep>${caso.receptor.direccion}</DirRecep>
                <CmnaRecep>${caso.receptor.comuna}</CmnaRecep>
                <CiudadRecep>${caso.receptor.ciudad}</CiudadRecep>
            </Receptor>
            <Totales>
                <MntNeto>${montoNeto}</MntNeto>
                <IVA>${montoIVA}</IVA>
                <MntTotal>${montoTotal}</MntTotal>
            </Totales>
        </Encabezado>
        <Detalle>
${caso.items.map((item, index) => `            <item>
                <NroLinDet>${index + 1}</NroLinDet>
                <NmbItem>${item.nombre}</NmbItem>
                <QtyItem>${item.cantidad}</QtyItem>
                <PrcItem>${item.precioUnitario}</PrcItem>
                <MontoItem>${item.montoItem}</MontoItem>
            </item>`).join('\n')}
        </Detalle>
    </Documento>
</DTE>`;
    }
}