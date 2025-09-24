import { CASOS_TEST } from '../app/api/dte/casos-test';
import { XMLGenerator } from '../app/api/dte/generators/xml-generator';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

export async function ejecutarTodosLosTests() {
  console.log(`🚀 Generando ${Object.keys(CASOS_TEST).length} DTEs de test SII...`);
  
  // Crear directorio para XMLs generados
  const outputDir = join(process.cwd(), 'generated-dtes');
  try {
    mkdirSync(outputDir, { recursive: true });
  } catch (error) {
    // Directorio ya existe
  }
  
  const resultados = {
    exitosos: 0,
    fallidos: 0,
    errores: [] as string[]
  };

  for (const [caso, datos] of Object.entries(CASOS_TEST)) {
    console.log(`\n📋 Generando caso: ${caso}`);
    try {
      // Validar estructura del caso
      if (!datos.tipoDTE || !datos.folio) {
        throw new Error('Faltan campos obligatorios');
      }
      
      if (!datos.receptor || !datos.receptor.rut) {
        throw new Error('Falta información del receptor');
      }
      
      // Generar XML según tipo de DTE
      let xml: string;
      let tipoDoc: string;
      
      switch (datos.tipoDTE) {
        case 33: // Factura Electrónica
          xml = XMLGenerator.generarFacturaElectronica(datos);
          tipoDoc = 'Factura Electrónica';
          break;
        case 34: // Factura Exenta
          xml = XMLGenerator.generarFacturaExenta(datos);
          tipoDoc = 'Factura Exenta';
          break;
        case 52: // Guía de Despacho
          xml = XMLGenerator.generarGuiaDespacho(datos);
          tipoDoc = 'Guía de Despacho';
          break;
        case 61: // Nota de Crédito
          if (datos.referencia?.tipoDTE === 34) {
            xml = XMLGenerator.generarFacturaExenta(datos); // Nota crédito exenta
          } else {
            xml = XMLGenerator.generarFacturaElectronica(datos); // Nota crédito afecta
          }
          tipoDoc = 'Nota de Crédito';
          break;
        case 56: // Nota de Débito
          if (datos.referencia?.tipoDTE === 34 || datos.referencia?.tipoDTE === 61) {
            xml = XMLGenerator.generarFacturaExenta(datos);
          } else {
            xml = XMLGenerator.generarFacturaElectronica(datos);
          }
          tipoDoc = 'Nota de Débito';
          break;
        default:
          throw new Error(`Tipo DTE ${datos.tipoDTE} no implementado`);
      }
      
      // Guardar XML generado
      const fileName = `${caso}_${tipoDoc.replace(/\s+/g, '_')}.xml`;
      const filePath = join(outputDir, fileName);
      writeFileSync(filePath, xml, 'utf-8');
      
      console.log(`✅ ${caso}: ${tipoDoc} generada - Folio ${datos.folio}`);
      console.log(`📄 Archivo: ${fileName}`);
      
      resultados.exitosos++;
      
    } catch (error: any) {
      console.log(`❌ ${caso}: ${error.message}`);
      resultados.fallidos++;
      resultados.errores.push(`${caso}: ${error.message}`);
    }
  }

  console.log(`\n📊 RESUMEN DE GENERACIÓN:`);
  console.log(`✅ DTEs generados: ${resultados.exitosos}`);
  console.log(`❌ Errores: ${resultados.fallidos}`);
  console.log(`📁 Archivos guardados en: ${outputDir}`);
  
  if (resultados.errores.length > 0) {
    console.log(`\n🔍 ERRORES ENCONTRADOS:`);
    resultados.errores.forEach(error => console.log(`   - ${error}`));
  }

  return resultados;
}

// Para ejecutar desde línea de comandos
if (require.main === module) {
  ejecutarTodosLosTests()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Error ejecutando generación:', error);
      process.exit(1);
    });
}