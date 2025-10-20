import { config } from 'dotenv';
import { getSeed, getToken, testConectividad, getTokenConCDATA } from '../lib/sii/token';
import { XMLSigner } from '../app/api/dte/generators/xml-signer';
import * as fs from 'fs';

config({ path: '.env.local' });

async function debugUploadSII() {
    console.log('🔍 DEBUG UPLOAD AL SII');
    console.log('='.repeat(50));
    
    try {
        // 1. Obtener token válido
        console.log('\n🔐 Obteniendo token...');
        const conectividad = await testConectividad('CERT');
        if (!conectividad) {
            throw new Error('No hay conectividad');
        }
        
        const semilla = await getSeed('CERT');
        console.log(`🌱 Semilla: ${semilla}`);
        
        const signer = new XMLSigner();
        
        // ✅ FIRMAR SEMILLA
        console.log('🔐 Firmando semilla con método corregido...');
        const semillaFirmada = signer.firmarSemillaCorregido(semilla);
        console.log(`🔐 Semilla firmada (${semillaFirmada.length} chars)`);
        
        // ✅ VALIDAR XML FIRMADO
        console.log('\n🔍 Validando estructura del XML firmado...');
        const esValido = signer.validarXMLFirmado(semillaFirmada);
        if (!esValido) {
            throw new Error('XML firmado no es válido según las reglas de SII');
        }
        console.log('✅ XML firmado es válido');
        
        // ✅ OBTENER TOKEN CON CDATA (que sabemos que funciona)
        console.log('\n🎫 Obteniendo token con CDATA...');
        const token = await getTokenConCDATA('CERT', semillaFirmada);
        console.log(`✅ Token obtenido: ${token}`);
        
        // 2. Crear XML DTE simple para testing
        console.log('\n🔧 Creando XML DTE de prueba...');
        const xmlDTESimple = crearXMLDTESimple();
        console.log(`📄 XML DTE creado (${xmlDTESimple.length} chars)`);
        
        // 3. Crear envío simple
        console.log('\n📦 Creando envío...');
        const xmlEnvioSimple = crearXMLEnvioSimple(xmlDTESimple);
        console.log(`📦 XML Envío creado (${xmlEnvioSimple.length} chars)`);
        
        // Guardar XMLs para inspección
        fs.writeFileSync('debug-dte.xml', xmlDTESimple);
        fs.writeFileSync('debug-envio.xml', xmlEnvioSimple);
        console.log('💾 XMLs guardados: debug-dte.xml, debug-envio.xml');

        // ✅ VERIFICAR QUE EL XML DEL ENVÍO SEA VÁLIDO
        console.log('\n🔍 Verificando XML del envío...');
        try {
            const parser = new (require('@xmldom/xmldom').DOMParser)();
            const doc = parser.parseFromString(xmlEnvioSimple, 'text/xml');
            if (doc.documentElement) {
                console.log('✅ XML del envío bien formado');
                console.log(`   📋 Elemento raíz: ${doc.documentElement.tagName}`);
                console.log(`   📋 Namespace: ${doc.documentElement.namespaceURI}`);
            } else {
                console.log('❌ XML del envío mal formado');
            }
        } catch (parseError: any) {
            console.log(`⚠️  Error parseando XML del envío: ${parseError.message}`);
        }
        
        // 4. ✅ USAR FORMATO CURL EQUIVALENTE (QUE SÍ FUNCIONA)
        console.log('\n🚀 Enviando con formato curl equivalente...');
        
        try {
            const trackId = await uploadConCurl('CERT', token, '77908357-8', '77908357-8', xmlEnvioSimple);
            console.log(`\n🎉 ¡ÉXITO! Track ID: ${trackId}`);
        } catch (uploadError: any) {
            console.error(`\n❌ Error final: ${uploadError.message}`);
            throw uploadError;
        }
        
    } catch (error: any) {
        console.error(`\n❌ Error: ${error.message}`);
        if (error.stack) {
            console.error('📍 Stack:', error.stack);
        }
    }
}

function crearXMLDTESimple(): string {
    const fechaHoy = new Date().toISOString().split('T')[0];
    const folio = Math.floor(Math.random() * 100000) + 1;
    
    return `<?xml version="1.0" encoding="ISO-8859-1"?>
<DTE version="1.0">
    <Documento ID="T33F${folio}">
        <Encabezado>
            <IdDoc>
                <TipoDTE>33</TipoDTE>
                <Folio>${folio}</Folio>
                <FchEmis>${fechaHoy}</FchEmis>
            </IdDoc>
            <Emisor>
                <RUTEmisor>77908357-8</RUTEmisor>
                <RznSoc>GASES BIOBIO SPA</RznSoc>
                <GiroEmis>VENTA DE GASES INDUSTRIALES</GiroEmis>
                <Acteco>251199</Acteco>
                <DirOrigen>AV BRASIL 2950</DirOrigen>
                <CmnaOrigen>SAN MIGUEL</CmnaOrigen>
                <CiudadOrigen>SANTIAGO</CiudadOrigen>
            </Emisor>
            <Receptor>
                <RUTRecep>96790240-3</RUTRecep>
                <RznSocRecep>SERVICIO DE IMPUESTOS INTERNOS</RznSocRecep>
                <DirRecep>TEATINOS 120</DirRecep>
                <CmnaRecep>SANTIAGO</CmnaRecep>
                <CiudadRecep>SANTIAGO</CiudadRecep>
            </Receptor>
            <Totales>
                <MntNeto>10000</MntNeto>
                <IVA>1900</IVA>
                <MntTotal>11900</MntTotal>
            </Totales>
        </Encabezado>
        <Detalle>
            <item>
                <NroLinDet>1</NroLinDet>
                <NmbItem>PRODUCTO DE PRUEBA</NmbItem>
                <QtyItem>1</QtyItem>
                <PrcItem>10000</PrcItem>
                <MontoItem>10000</MontoItem>
            </item>
        </Detalle>
    </Documento>
</DTE>`;
}

function crearXMLEnvioSimple(xmlDTE: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '').replace('T', '').substring(0, 14);
    
    return `<?xml version="1.0" encoding="ISO-8859-1"?>
<EnvioDTE version="1.0" xmlns="http://www.sii.cl/SiiDte" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sii.cl/SiiDte EnvioDTE_v10.xsd">
    <SetDTE ID="SetDoc${timestamp}">
        <Caratula version="1.0">
            <RutEmisor>77908357-8</RutEmisor>
            <RutEnvia>77908357-8</RutEnvia>
            <RutReceptor>60803000-K</RutReceptor>
            <FchResol>2006-02-17</FchResol>
            <NroResol>102</NroResol>
            <TmstFirmaEnv>${new Date().toISOString()}</TmstFirmaEnv>
            <SubTotDTE>
                <TpoDTE>33</TpoDTE>
                <NroDTE>1</NroDTE>
            </SubTotDTE>
        </Caratula>
        ${xmlDTE}
    </SetDTE>
</EnvioDTE>`;
}

// ✅ FUNCIÓN DE UPLOAD QUE REPLICA EXACTAMENTE EL FORMATO CURL
async function uploadConCurl(
    ambiente: 'CERT' | 'PROD',
    token: string,
    rutEmisor: string,
    rutCompania: string,
    xmlEnvio: string
): Promise<string> {
    const https = require('https');
    
    const urls = {
        CERT: 'https://maullin.sii.cl/cgi_dte/UPL/DTEUpload',
        PROD: 'https://palena.sii.cl/cgi_dte/UPL/DTEUpload'
    };
    
    console.log(`📤 Upload con formato curl (${ambiente})...`);
    console.log(`   🔑 Token: ${token}`);
    console.log(`   🏢 RUT: ${rutEmisor}`);
    
    return new Promise((resolve, reject) => {
        // ✅ BOUNDARY FIJO QUE FUNCIONA
        const boundary = '----formdata-curl-equivalent';
        
        // ✅ CONSTRUCCIÓN EXACTA COMO LO HACE CURL
        const parts = [
            `--${boundary}`,
            `Content-Disposition: form-data; name="token"`,
            ``,
            token,
            `--${boundary}`,
            `Content-Disposition: form-data; name="rutSender"`,
            ``,
            rutEmisor,
            `--${boundary}`,
            `Content-Disposition: form-data; name="rutCompany"`,
            ``,
            rutCompania,
            `--${boundary}`,
            `Content-Disposition: form-data; name="archivo"; filename="envio.xml"`,
            `Content-Type: text/xml`,
            ``,
            xmlEnvio,
            `--${boundary}--`
        ];
        
        const body = parts.join('\r\n') + '\r\n';
        
        console.log(`   📋 Boundary: ${boundary}`);
        console.log(`   📋 Content-Length: ${Buffer.byteLength(body)}`);
        console.log(`   📄 Body structure (first 400 chars):`);
        console.log(body.substring(0, 400));
        
        // ✅ GUARDAR PARA ANÁLISIS
        fs.writeFileSync('debug-curl-body.txt', body);
        console.log('   💾 Curl body guardado en: debug-curl-body.txt');
        
        const url = new URL(urls[ambiente]);
        
        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': Buffer.byteLength(body),
                'User-Agent': 'curl/7.68.0',
                'Accept': '*/*'
            }
        };
        
        console.log(`   🌐 URL: ${urls[ambiente]}`);
        console.log(`   📋 Headers:`, JSON.stringify(options.headers, null, 2));
        
        const req = https.request(options, (res: any) => {
            console.log(`   📊 Status: ${res.statusCode} ${res.statusMessage}`);
            
            const chunks: Buffer[] = [];
            res.on('data', (chunk: any) => {
                chunks.push(chunk);
                console.log(`   📥 Chunk: ${chunk.length} bytes`);
            });
            
            res.on('end', () => {
                const response = Buffer.concat(chunks).toString();
                console.log(`   📄 Response (${response.length} chars):`);
                console.log(`   📄 ${'-'.repeat(50)}`);
                console.log(response);
                console.log(`   📄 ${'-'.repeat(50)}`);
                
                fs.writeFileSync('debug-curl-response.txt', response);
                console.log('   💾 Response guardada en: debug-curl-response.txt');
                
                // ✅ ANÁLISIS DE LA RESPUESTA
                if (response.includes('ERROR : 501') && response.includes('ptr NULL')) {
                    reject(new Error('Error 501: SII sigue sin poder leer el token. Problema en el servidor del SII o formato incompatible.'));
                    return;
                }
                
                if (response.includes('ERROR') || response.includes('Error')) {
                    const errorMatch = response.match(/Error\s*:\s*([^<\n]+)/i);
                    const errorMsg = errorMatch ? errorMatch[1].trim() : 'Error del SII';
                    reject(new Error(`Error del SII: ${errorMsg}`));
                    return;
                }
                
                // Buscar Track ID o éxito
                const trackPatterns = [
                    /TRACKID[^0-9]*([0-9]+)/i,
                    /([0-9]{8,})/g,
                    /recibido.*?([0-9]{6,})/i
                ];
                
                for (const pattern of trackPatterns) {
                    const match = response.match(pattern);
                    if (match) {
                        const trackId = pattern.global ? 
                            match.find(m => m.length >= 6) : 
                            match[1];
                        if (trackId) {
                            console.log(`   ✅ Track ID: ${trackId}`);
                            resolve(trackId);
                            return;
                        }
                    }
                }
                
                // Si no hay errores pero tampoco track ID
                if (response.toLowerCase().includes('recibido') || 
                    response.toLowerCase().includes('ok') || 
                    response.toLowerCase().includes('exitoso')) {
                    console.log('   ✅ Upload exitoso (sin Track ID claro)');
                    resolve('SUCCESS_NO_TRACK');
                    return;
                }
                
                reject(new Error('Respuesta desconocida del SII'));
            });
        });
        
        req.on('error', (error: unknown) => {
            console.error(`   ❌ Network error: ${error instanceof Error ? error.message : String(error)}`);
            reject(error);
        });
        
        req.setTimeout(30000, () => {
            console.error('   ❌ Timeout');
            req.destroy();
            reject(new Error('Timeout'));
        });
        
        console.log('   📤 Enviando...');
        req.write(body);
        req.end();
        console.log('   ✅ Enviado');
    });
}

// AGREGAR esta función al final del archivo, ANTES del if (require.main === module):

// ✅ PRUEBA CON FORMATO RAW (COMO CLIENTE OFICIAL)
async function uploadConFormatoRaw(
    ambiente: 'CERT' | 'PROD',
    token: string,
    rutEmisor: string,
    rutCompania: string,
    xmlEnvio: string
): Promise<string> {
    const https = require('https');
    
    const urls = {
        CERT: 'https://maullin.sii.cl/cgi_dte/UPL/DTEUpload',
        PROD: 'https://palena.sii.cl/cgi_dte/UPL/DTEUpload'
    };
    
    console.log(`📤 Upload con formato RAW (${ambiente})...`);
    console.log(`   🔑 Token: ${token}`);
    
    return new Promise((resolve, reject) => {
        // ✅ CONSTRUIR DATOS COMO QUERY STRING
        const queryString = new URLSearchParams({
            token: token,
            rutSender: rutEmisor,
            rutCompany: rutCompania,
            archivo: xmlEnvio
        }).toString();
        
        console.log(`   📋 Query String Length: ${queryString.length}`);
        console.log(`   📄 Query preview (first 200 chars):`);
        console.log(queryString.substring(0, 200));
        
        // ✅ GUARDAR PARA ANÁLISIS
        fs.writeFileSync('debug-raw-data.txt', queryString);
        console.log('   💾 Raw data guardado en: debug-raw-data.txt');
        
        const url = new URL(urls[ambiente]);
        
        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(queryString),
                'User-Agent': 'SII-DTE-Client/1.0',
                'Accept': 'text/html,application/xml,*/*'
            }
        };
        
        console.log(`   🌐 URL: ${urls[ambiente]}`);
        console.log(`   📋 Headers:`, JSON.stringify(options.headers, null, 2));
        
        const req = https.request(options, (res: any) => {
            console.log(`   📊 Status: ${res.statusCode} ${res.statusMessage}`);
            
            const chunks: Buffer[] = [];
            res.on('data', (chunk: any) => {
                chunks.push(chunk);
                console.log(`   📥 Chunk: ${chunk.length} bytes`);
            });
            
            res.on('end', () => {
                const response = Buffer.concat(chunks).toString();
                console.log(`   📄 RAW Response (${response.length} chars):`);
                console.log(`   📄 ${'-'.repeat(50)}`);
                console.log(response);
                console.log(`   📄 ${'-'.repeat(50)}`);
                
                fs.writeFileSync('debug-raw-response.txt', response);
                console.log('   💾 RAW Response guardada en: debug-raw-response.txt');
                
                // ✅ ANÁLISIS DE LA RESPUESTA
                if (response.includes('ERROR : 501') && response.includes('ptr NULL')) {
                    reject(new Error('Error 501: Formato RAW también falló con ptr NULL'));
                    return;
                }
                
                if (response.includes('ERROR') || response.includes('Error')) {
                    const errorMatch = response.match(/Error\s*:\s*([^<\n]+)/i);
                    const errorMsg = errorMatch ? errorMatch[1].trim() : 'Error del SII';
                    reject(new Error(`Error RAW del SII: ${errorMsg}`));
                    return;
                }
                
                // Buscar Track ID
                const trackPatterns = [
                    /TRACKID[^0-9]*([0-9]+)/i,
                    /([0-9]{8,})/g,
                    /recibido.*?([0-9]{6,})/i
                ];
                
                for (const pattern of trackPatterns) {
                    const match = response.match(pattern);
                    if (match) {
                        const trackId = pattern.global ? 
                            match.find(m => m.length >= 6) : 
                            match[1];
                        if (trackId) {
                            console.log(`   ✅ RAW Track ID: ${trackId}`);
                            resolve(trackId);
                            return;
                        }
                    }
                }
                
                // Si no hay errores pero tampoco track ID
                if (response.toLowerCase().includes('recibido') || 
                    response.toLowerCase().includes('ok') || 
                    response.toLowerCase().includes('exitoso')) {
                    console.log('   ✅ RAW Upload exitoso (sin Track ID claro)');
                    resolve('RAW_SUCCESS_NO_TRACK');
                    return;
                }
                
                reject(new Error('RAW: Respuesta desconocida del SII'));
            });
        });
        
        req.on('error', (error: unknown) => {
            console.error(`   ❌ RAW Network error: ${error instanceof Error ? error.message : String(error)}`);
            reject(error);
        });
        
        req.setTimeout(30000, () => {
            console.error('   ❌ RAW Timeout');
            req.destroy();
            reject(new Error('RAW Timeout'));
        });
        
        console.log('   📤 Enviando RAW...');
        req.write(queryString);
        req.end();
        console.log('   ✅ RAW Enviado');
    });
}

if (require.main === module) {
    debugUploadSII()
        .then(() => {
            console.log('\n✅ Debug completado exitosamente');
        })
        .catch(error => {
            console.error('\n💥 Debug falló:', error.message);
        });
}