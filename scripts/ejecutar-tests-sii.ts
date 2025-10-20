import { config } from 'dotenv';
import { getSeed, getToken, testConectividad } from '../lib/sii/token';
import { XMLSigner } from '../app/api/dte/generators/xml-signer';
import { dteUpload } from '../lib/sii/upload';
import { XMLGenerator } from '../app/api/dte/generators/xml-generator';
import { buildEnvioDTE } from '../lib/sii/xml/envio';
import { CASOS_TEST } from '../app/api/dte/casos-test';

config({ path: '.env.local' });

interface ResultadoEnvio {
    caso: string;
    tipoDTE: number;
    trackId?: string;
    error?: string;
    exitoso: boolean;
    timestamp?: string;
}

// ✅ FUNCIÓN REAL PARA ENVÍO
async function enviarCasoSII(casoId: string): Promise<ResultadoEnvio> {
    const timestamp = new Date().toISOString();
    
    try {
        const caso = CASOS_TEST[casoId];
        if (!caso) {
            throw new Error(`Caso ${casoId} no encontrado`);
        }
        
        console.log(`\n📋 Procesando caso ${casoId} - Tipo DTE: ${caso.tipoDTE}`);
        console.log(`⏰ Timestamp: ${timestamp}`);
        
        // 1. Generar XML del DTE
        console.log('   🔧 Generando XML del DTE...');
        const xmlDTE = XMLGenerator.generarYFirmarDTE(caso);
        console.log('   ✅ XML generado y firmado');
        
        // 2. Obtener token (reutilizar si existe)
        console.log('   🔐 Obteniendo token SII...');
        const token = await obtenerTokenSII();
        console.log('   ✅ Token obtenido');
        
        // 3. Crear envío
        console.log('   📦 Creando envío DTE...');
        const rutEmisor = process.env.EMISOR_RUT || '77908357-8';
        const xmlEnvio = buildEnvioDTE([xmlDTE], rutEmisor, '96790240-3');
        console.log('   ✅ Envío creado');
        
        // 4. Enviar al SII
        console.log('   🚀 Enviando al SII...');
        const trackId = await dteUpload('CERT', token, rutEmisor, rutEmisor, xmlEnvio);
        
        console.log(`   🎉 EXITOSO - Track ID: ${trackId}`);
        
        return {
            caso: casoId,
            tipoDTE: caso.tipoDTE,
            trackId,
            exitoso: true,
            timestamp
        };
        
    } catch (error: any) {
        console.error(`   ❌ ERROR en caso ${casoId}: ${error.message}`);
        
        return {
            caso: casoId,
            tipoDTE: CASOS_TEST[casoId]?.tipoDTE || 0,
            error: error.message,
            exitoso: false,
            timestamp
        };
    }
}

let tokenGlobal: string | null = null;
let tokenTimestamp: number = 0;
const TOKEN_EXPIRY_MS = 20 * 60 * 1000; // 20 minutos

async function obtenerTokenSII(): Promise<string> {
    const ahora = Date.now();
    
    // Reutilizar token si aún es válido
    if (tokenGlobal && (ahora - tokenTimestamp) < TOKEN_EXPIRY_MS) {
        console.log('🔄 Reutilizando token existente');
        return tokenGlobal;
    }
    
    console.log('🔐 Obteniendo nuevo token del SII...');
    
    try {
        // 1. Test conectividad
        console.log('   🔍 Verificando conectividad...');
        const conectividad = await testConectividad('CERT');
        if (!conectividad) {
            throw new Error('No hay conectividad con SII');
        }
        console.log('   ✅ Conectividad OK');
        
        // 2. Obtener semilla
        console.log('   🌱 Obteniendo semilla...');
        const semilla = await getSeed('CERT');
        console.log(`   ✅ Semilla obtenida: ${semilla}`);
        
        // 3. Firmar semilla
        console.log('   🔐 Firmando semilla...');
        const signer = new XMLSigner();
        const semillaFirmada = signer.firmarSemilla(semilla);
        console.log('   ✅ Semilla firmada');
        
        // 4. Obtener token
        console.log('   🎫 Solicitando token...');
        tokenGlobal = await getToken('CERT', semillaFirmada);
        tokenTimestamp = ahora;
        
        console.log('   ✅ Token obtenido exitosamente');
        return tokenGlobal;
        
    } catch (error: any) {
        console.error(`❌ Error obteniendo token: ${error.message}`);
        throw error;
    }
}

async function ejecutarCertificacionCompleta(): Promise<void> {
    console.log('🧪 INICIANDO CERTIFICACIÓN COMPLETA SII');
    console.log('=' .repeat(60));
    console.log(`📅 Fecha: ${new Date().toLocaleString('es-CL')}`);
    console.log(`🏢 Empresa: GASES BIOBIO SPA`);
    console.log(`🆔 RUT: 77908357-8`);
    console.log('=' .repeat(60));
    
    // Casos que debes enviar para certificación
    const casosCertificacion = [
        // SET BÁSICO (4444651) - 8 casos
        '4444651-1', '4444651-2', '4444651-3', '4444651-4', 
        '4444651-5', '4444651-6', '4444651-7', '4444651-8',
        
        // SET GUÍA DE DESPACHO (4444652) - 3 casos
        '4444652-1', '4444652-2', '4444652-3',
        
        // SET FACTURA EXENTA (4444653) - 8 casos
        '4444653-1', '4444653-2', '4444653-3', '4444653-4',
        '4444653-5', '4444653-6', '4444653-7', '4444653-8'
    ];
    
    console.log(`📊 Total casos a procesar: ${casosCertificacion.length}`);
    console.log('📋 Sets: SET_BASICO(8) + SET_GUIAS(3) + SET_EXENTAS(8)');
    
    const resultados: ResultadoEnvio[] = [];
    let procesados = 0;
    
    for (const casoId of casosCertificacion) {
        procesados++;
        console.log(`\n🔄 [${procesados}/${casosCertificacion.length}] Procesando ${casoId}...`);
        
        try {
            const resultado = await enviarCasoSII(casoId);
            resultados.push(resultado);
            
            if (resultado.exitoso) {
                console.log(`✅ [${procesados}/${casosCertificacion.length}] ${casoId} EXITOSO`);
            } else {
                console.log(`❌ [${procesados}/${casosCertificacion.length}] ${casoId} FALLÓ`);
            }
            
        } catch (error: any) {
            console.error(`💥 Error procesando ${casoId}: ${error.message}`);
            resultados.push({
                caso: casoId,
                tipoDTE: CASOS_TEST[casoId]?.tipoDTE || 0,
                error: error.message,
                exitoso: false,
                timestamp: new Date().toISOString()
            });
        }
        
        // Pausa entre envíos para evitar saturar el SII
        if (procesados < casosCertificacion.length) {
            console.log('   ⏳ Esperando 3 segundos...');
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
    
    // Generar reporte final
    generarReporteCertificacion(resultados);
}

function generarReporteCertificacion(resultados: ResultadoEnvio[]): void {
    console.log('\n' + '='.repeat(60));
    console.log('📋 REPORTE FINAL DE CERTIFICACIÓN SII');
    console.log('='.repeat(60));
    
    const exitosos = resultados.filter(r => r.exitoso);
    const fallidos = resultados.filter(r => !r.exitoso);
    
    console.log(`✅ Exitosos: ${exitosos.length}/${resultados.length}`);
    console.log(`❌ Fallidos: ${fallidos.length}/${resultados.length}`);
    console.log(`📈 Tasa de éxito: ${((exitosos.length / resultados.length) * 100).toFixed(1)}%`);
    
    if (exitosos.length > 0) {
        console.log('\n🎯 NÚMEROS DE ENVÍO PARA CERTIFICACIÓN SII:');
        console.log('='.repeat(50));
        
        // Agrupar por sets
        const setBasico = exitosos.filter(r => r.caso.startsWith('4444651'));
        const setGuias = exitosos.filter(r => r.caso.startsWith('4444652'));
        const setExentas = exitosos.filter(r => r.caso.startsWith('4444653'));
        
        if (setBasico.length > 0) {
            console.log('\n📋 SET BÁSICO (FACTURAS AFECTAS):');
            console.log(`   Estado: ${setBasico.length}/8 casos exitosos`);
            setBasico.forEach(r => {
                console.log(`   ✅ ${r.caso}: Track ID ${r.trackId}`);
            });
        }
        
        if (setGuias.length > 0) {
            console.log('\n🚚 SET GUÍA DE DESPACHO:');
            console.log(`   Estado: ${setGuias.length}/3 casos exitosos`);
            setGuias.forEach(r => {
                console.log(`   ✅ ${r.caso}: Track ID ${r.trackId}`);
            });
        }
        
        if (setExentas.length > 0) {
            console.log('\n💰 SET FACTURA EXENTA:');
            console.log(`   Estado: ${setExentas.length}/8 casos exitosos`);
            setExentas.forEach(r => {
                console.log(`   ✅ ${r.caso}: Track ID ${r.trackId}`);
            });
        }
        
        console.log(`\n📅 Fecha de envío: ${new Date().toLocaleDateString('es-CL')}`);
        console.log(`⏰ Hora de finalización: ${new Date().toLocaleTimeString('es-CL')}`);
    }
    
    if (fallidos.length > 0) {
        console.log('\n❌ CASOS FALLIDOS (requieren revisión):');
        console.log('='.repeat(40));
        fallidos.forEach(r => {
            console.log(`   ❌ ${r.caso}: ${r.error}`);
        });
    }
    
    // Guardar reporte completo en archivo JSON
    const fs = require('fs');
    const reporte = {
        metadata: {
            fecha: new Date().toISOString(),
            empresa: 'GASES BIOBIO SPA',
            rut: '77908357-8',
            ambiente: 'CERTIFICACION',
            totalCasos: resultados.length,
            exitosos: exitosos.length,
            fallidos: fallidos.length,
            tasaExito: ((exitosos.length / resultados.length) * 100).toFixed(1) + '%'
        },
        resultados: resultados
    };
    
    fs.writeFileSync('reporte-certificacion-sii.json', JSON.stringify(reporte, null, 2));
    console.log('\n💾 Reporte completo guardado en: reporte-certificacion-sii.json');
    
    console.log('\n🎉 CERTIFICACIÓN COMPLETADA');
    console.log('='.repeat(60));
}

if (require.main === module) {
    ejecutarCertificacionCompleta()
        .then(() => {
            console.log('\n🚀 Proceso completado exitosamente');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Error fatal en certificación:', error);
            console.error('📍 Stack trace:', error.stack);
            process.exit(1);
        });
}