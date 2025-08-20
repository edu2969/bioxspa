import { create as createXml } from 'xmlbuilder2';
import { XMLBuilder } from 'xmlbuilder2/lib/interfaces';

export function buildEnvioDTE(xmlDTEs: string[], emisorRut: string, receptorRut: string) {
  const doc = createXml({ version: '1.0', encoding: 'ISO-8859-1' })
    .ele('EnvioDTE', { xmlns: 'http://www.sii.cl/SiiDte', version: '1.0' })
      .ele('SetDTE', { ID: 'SIISetDTE1' })
        .ele('Caratula', { version: '1.0' })
          .ele('RutEmisor').txt(emisorRut).up()
          .ele('RutEnvia').txt(receptorRut).up()
          .ele('RutReceptor').txt('60803000-K').up()
          .ele('FchResol').txt('2020-01-01').up()
          .ele('NroResol').txt('80').up()
          .ele('TmstFirmaEnv').txt(new Date().toISOString()).up()
        .up();  

  

  const setNode = doc.find((node: XMLBuilder) => node.node.nodeName === 'SetDTE') as XMLBuilder;
  xmlDTEs.forEach(x => {
    const dteNode = createXml(x);
    setNode.import(dteNode);
  });

  return doc.end({ prettyPrint: true });
}