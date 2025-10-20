import { config } from 'dotenv';
import { getSeed } from '../lib/sii/token';
import { XMLSigner } from '../app/api/dte/generators/xml-signer';
import * as fs from 'fs';

config({ path: '.env.local' });

async function testFirmaSimple() {
    console.log('🧪 TEST FIRMA SIMPLE');
    console.log('='.repeat(40));
    
    try {
        // 1. Obtener semilla
        const semilla = await getSeed('CERT');
        console.log(`🌱 Semilla obtenida: ${semilla}`);
        
        // 2. Crear XML de semilla simple
        const xmlSemilla = `<?xml version="1.0" encoding="UTF-8"?>
<getToken>
<item>
<Semilla>${semilla}</Semilla>
</item>
</getToken>`;
        
        console.log('📄 XML Semilla original:');
        console.log(xmlSemilla);
        
        // 3. Firmar con método corregido
        const signer = new XMLSigner();
        const xmlFirmado = signer.firmarSemillaCorregido(semilla);
        
        console.log('\n📄 XML Firmado (primeros 1000 chars):');
        console.log(xmlFirmado.substring(0, 1000) + '...');
        
        // 4. Verificar que contiene Certificate
        if (xmlFirmado.includes('<X509Certificate>')) {
            console.log('\n✅ XML contiene elemento X509Certificate');
        } else {
            console.log('\n❌ XML NO contiene elemento X509Certificate');
        }
        
        if (xmlFirmado.includes('<RSAKeyValue>')) {
            console.log('✅ XML contiene elemento RSAKeyValue');
        } else {
            console.log('❌ XML NO contiene elemento RSAKeyValue');
        }
        
        // 5. Guardar para inspección
        fs.writeFileSync('semilla-firmada-corregida.xml', xmlFirmado);
        console.log('\n💾 Archivo guardado: semilla-firmada-corregida.xml');
        
        return xmlFirmado;
        
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        throw error;
    }
}

if (require.main === module) {
    testFirmaSimple()
        .then(() => {
            console.log('\n✅ Test completado');
        })
        .catch(error => {
            console.error('\n💥 Test falló:', error.message);
        });
}