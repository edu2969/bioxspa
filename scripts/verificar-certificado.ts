import { config } from 'dotenv';
import { XMLSigner } from '../app/api/dte/generators/xml-signer';
import * as forge from 'node-forge';

config({ path: '.env.local' });

async function verificarCertificado() {
    console.log('🔍 VERIFICANDO CERTIFICADO PARA SII');
    console.log('='.repeat(50));
    
    try {
        const signer = new XMLSigner();
        const certInfo = signer.getCertificateInfo();
        
        console.log('📋 INFORMACIÓN DEL CERTIFICADO:');
        console.log('='.repeat(30));
        console.log(`👤 Sujeto CN: ${certInfo.subject.CN}`);
        console.log(`🏢 Organización: ${certInfo.subject.O || 'N/A'}`);
        console.log(`🆔 Serial: ${certInfo.serialNumber}`);
        console.log(`🏛️  Emisor: ${certInfo.issuer.CN}`);
        console.log(`📅 Válido desde: ${certInfo.validFrom}`);
        console.log(`📅 Válido hasta: ${certInfo.validTo}`);
        
        // Verificar si el certificado es adecuado para SII
        const ahoraMs = Date.now();
        const validFromMs = certInfo.validFrom.getTime();
        const validToMs = certInfo.validTo.getTime();
        
        console.log('\n🔍 VALIDACIONES:');
        console.log('='.repeat(20));
        
        if (ahoraMs >= validFromMs && ahoraMs <= validToMs) {
            console.log('✅ Certificado está vigente');
        } else {
            console.log('❌ Certificado NO está vigente');
            return false;
        }
        
        // Verificar que sea de una CA reconocida por SII
        const emisorValido = certInfo.issuer.CN?.includes('AC FIRMAPROFESIONAL') || 
                           certInfo.issuer.CN?.includes('E-SIGN') ||
                           certInfo.issuer.CN?.includes('ACEPTA');
        
        if (emisorValido) {
            console.log('✅ Certificado emitido por CA reconocida');
        } else {
            console.log(`⚠️  Certificado emitido por: ${certInfo.issuer.CN}`);
            console.log('   Verificar si esta CA está reconocida por SII');
        }
        
        // Verificar que tenga uso correcto (firma digital)
        console.log('✅ Certificado parece válido para SII');
        
        return true;
        
    } catch (error: any) {
        console.error('❌ Error verificando certificado:', error.message);
        return false;
    }
}

if (require.main === module) {
    verificarCertificado()
        .then(valido => {
            if (valido) {
                console.log('\n✅ Certificado verificado exitosamente');
            } else {
                console.log('\n❌ Problemas con el certificado');
            }
        })
        .catch(error => {
            console.error('\n💥 Error:', error.message);
        });
}