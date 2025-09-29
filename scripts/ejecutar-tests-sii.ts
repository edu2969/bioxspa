import { config } from 'dotenv';
import { CASOS_TEST } from '../app/api/dte/casos-test';
import { XMLGenerator } from '../app/api/dte/generators/xml-generator';
import { PDFGenerator } from '../app/api/dte/generators/pdf-generator';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

config({ path: '.env.local' });

export async function ejecutarTodosLosTests() {
  console.log(`🚀 Generando XMLs firmados y PDFs de ${Object.keys(CASOS_TEST).length} casos de test SII...`);
  console.log(`🔐 Usando certificado desde variables de entorno...`);
  
  // Verificar variables de entorno
  if (!process.env.PFX_BASE64) {
    console.error('❌ PFX_BASE64 no está configurado en .env.local');
    return;
  }

  // Crear directorios
  const outputDir = join(process.cwd(), 'generated-dtes');
  const pdfDir = join(outputDir, 'pdfs');
  
  try {
    mkdirSync(outputDir, { recursive: true });
    mkdirSync(pdfDir, { recursive: true });
  } catch (error) {
    // Directorios ya existen
  }
  
  const resultados = {
    exitosos: 0,
    fallidos: 0,
    errores: [] as string[]
  };

  for (const [caso, datos] of Object.entries(CASOS_TEST)) {
    console.log(`\n📋 Procesando caso: ${caso}`);
    
    try {
      // 1. Generar y firmar XML
      const xmlFirmado = XMLGenerator.generarYFirmarDTE(datos);
      
      // Determinar tipo de documento
      const tiposDoc: {[key: number]: string} = {
        33: 'Factura_Electronica',
        34: 'Factura_Exenta', 
        52: 'Guia_Despacho',
        61: 'Nota_Credito',
        56: 'Nota_Debito'
      };
      
      const tipoDoc = tiposDoc[datos.tipoDTE] || `Tipo_${datos.tipoDTE}`;
      
      // 2. Guardar XML firmado
      const xmlFileName = `${caso}_${tipoDoc}_FIRMADO.xml`;
      const xmlFilePath = join(outputDir, xmlFileName);
      writeFileSync(xmlFilePath, xmlFirmado, 'utf-8');
      
      // 3. Generar PDF
      const pdfFileName = `${caso}_${tipoDoc}.pdf`;
      const pdfFilePath = join(pdfDir, pdfFileName);
      
      console.log(`📄 Generando PDF...`);
      await PDFGenerator.generarFacturaPDF(datos, pdfFilePath);
      
      console.log(`✅ ${caso}: ${tipoDoc} - Folio ${datos.folio}`);
      console.log(`   📄 XML: ${xmlFileName}`);
      console.log(`   🎨 PDF: ${pdfFileName}`);
      
      resultados.exitosos++;
      
    } catch (error: any) {
      console.log(`❌ ${caso}: ${error.message}`);
      resultados.fallidos++;
      resultados.errores.push(`${caso}: ${error.message}`);
    }
  }

  console.log(`\n📊 RESUMEN DE GENERACIÓN:`);
  console.log(`✅ Documentos procesados: ${resultados.exitosos}`);
  console.log(`❌ Errores: ${resultados.fallidos}`);
  console.log(`📁 XMLs guardados en: ${outputDir}`);
  console.log(`🎨 PDFs guardados en: ${pdfDir}`);
  
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