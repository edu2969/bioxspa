import https from "https";
import { setTimeout } from "timers/promises";

const MAX_REINTENTOS = 3;
const DELAY_ENTRE_REINTENTOS = 5000;
const TIMEOUT = 30000;

const URLS_SII = {
    CERT: {
        semilla: 'https://maullin.sii.cl/DTEWS/CrSeed.jws',
        token: 'https://maullin.sii.cl/DTEWS/GetTokenFromSeed.jws',
        query: 'https://maullin.sii.cl/DTEWS/QueryEstUp.jws',
        upload: 'https://maullin.sii.cl/cgi_dte/UPL/DTEUpload'
    },
    PROD: {
        semilla: 'https://palena.sii.cl/DTEWS/CrSeed.jws',
        token: 'https://palena.sii.cl/DTEWS/GetTokenFromSeed.jws',
        query: 'https://palena.sii.cl/DTEWS/QueryEstUp.jws',
        upload: 'https://palena.sii.cl/cgi_dte/UPL/DTEUpload'
    }
};

async function fetchSOAPConReintentos(url: string, soapBody: string): Promise<string> {
    let ultimoError: Error | null = null;
    
    for (let intento = 1; intento <= MAX_REINTENTOS; intento++) {
        try {
            console.log(`🔄 SOAP Intento ${intento}/${MAX_REINTENTOS} - ${url}`);
            
            const resultado = await new Promise<string>((resolve, reject) => {
                const parsed = new URL(url);
                const opts: https.RequestOptions = {
                    hostname: parsed.hostname,
                    port: parsed.port || 443,
                    path: parsed.pathname + parsed.search,
                    method: "POST",
                    headers: {
                        "Content-Type": "text/xml; charset=utf-8",
                        "Content-Length": Buffer.byteLength(soapBody),
                        "SOAPAction": '""',
                        "User-Agent": "BIOXSPA-DTE-Client/1.0",
                        "Accept": "text/xml,application/xml",
                        "Connection": "keep-alive"
                    },
                    timeout: TIMEOUT,
                };
                
                const req = https.request(opts, (res) => {
                    console.log(`   📊 Status: ${res.statusCode} ${res.statusMessage}`);
                    
                    if (res.statusCode === 503) {
                        reject(new Error(`Servicio no disponible (503)`));
                        return;
                    }
                    
                    if (res.statusCode !== 200) {
                        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                        return;
                    }
                    
                    const chunks: Buffer[] = [];
                    res.on("data", (c) => chunks.push(c));
                    res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
                });
                
                req.on("error", reject);
                req.on("timeout", () => {
                    req.destroy();
                    reject(new Error(`Timeout después de ${TIMEOUT}ms`));
                });
                
                req.write(soapBody);
                req.end();
            });
            
            console.log(`   ✅ SOAP Éxito en intento ${intento}`);
            return resultado;
            
        } catch (error: unknown) {
            if (error instanceof Error) {
                ultimoError = error;
            } else {
                ultimoError = new Error(String(error));
            }
            const message = error instanceof Error ? error.message : String(error);
            console.log(`   ❌ SOAP Error en intento ${intento}: ${message}`);

            if (intento < MAX_REINTENTOS) {
                console.log(`   ⏰ Esperando ${DELAY_ENTRE_REINTENTOS}ms...`);
                await setTimeout(DELAY_ENTRE_REINTENTOS);
            }
        }
    }
    
    throw ultimoError || new Error('Todos los intentos SOAP fallaron');
}

function buildSoapEnvelope(operation: string, params: Record<string, string> = {}): string {
    const bodyParams = Object.keys(params)
        .map((k) => `<${k}>${escapeXml(params[k])}</${k}>`)
        .join("");
    
    const body = bodyParams.length > 0
        ? `<${operation} xmlns="http://DefaultNamespace">${bodyParams}</${operation}>`
        : `<${operation} xmlns="http://DefaultNamespace" />`;
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:impl="http://DefaultNamespace">
    <soapenv:Header/>
    <soapenv:Body>
        ${body}
    </soapenv:Body>
</soapenv:Envelope>`;
}

function escapeXml(s: string): string {
    return s.replace(/&/g, "&amp;")
           .replace(/</g, "&lt;")
           .replace(/>/g, "&gt;")
           .replace(/"/g, "&quot;")
           .replace(/'/g, "&apos;");
}

function extractSOAPResponse(soapResponse: string, operation: string): string | null {
    const patterns = [
        new RegExp(`<ns1:${operation}Response[^>]*>([\\s\\S]*?)</ns1:${operation}Response>`, 'i'),
        new RegExp(`<${operation}Response[^>]*>([\\s\\S]*?)</${operation}Response>`, 'i'),
        new RegExp(`<ns1:${operation}Return>([^<]+)</ns1:${operation}Return>`, 'i'),
        new RegExp(`<${operation}Return>([^<]+)</${operation}Return>`, 'i'),
        /<return>([^<]+)<\/return>/i,
        /<getSeedReturn>([^<]+)<\/getSeedReturn>/i,
        /<getTokenReturn>([^<]+)<\/getTokenReturn>/i
    ];
    
    for (const pattern of patterns) {
        const match = soapResponse.match(pattern);
        if (match) {
            return match[1].trim();
        }
    }
    
    return null;
}

// ✅ MÉTODO CORREGIDO PARA OBTENER SEMILLA
export async function getSeed(ambiente: 'CERT' | 'PROD' = 'CERT'): Promise<string> {
    console.log(`🌱 Obteniendo semilla del SII vía SOAP (${ambiente})...`);
    
    const urls = URLS_SII[ambiente];
    
    try {
        const soapBody = buildSoapEnvelope('getSeed');
        const response = await fetchSOAPConReintentos(urls.semilla, soapBody);
        
        console.log(`📄 Respuesta SOAP: ${response.substring(0, 300)}...`);
        
        const semillaXML = extractSOAPResponse(response, 'getSeed');
        
        if (semillaXML) {
            // Decodificar entidades HTML
            const semillaDecodificada = semillaXML
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&amp;/g, '&');
            
            console.log(`📄 Semilla XML decodificada: ${semillaDecodificada}`);
            
            // Extraer el número de semilla real
            const semillaMatch = semillaDecodificada.match(/<SEMILLA>([^<]+)<\/SEMILLA>/);
            
            if (semillaMatch && semillaMatch[1]) {
                const semilla = semillaMatch[1];
                console.log(`✅ Semilla numérica obtenida: ${semilla}`);
                return semilla;
            }
            
            throw new Error('No se pudo extraer número de semilla del XML de respuesta');
        }
        
        throw new Error('Semilla no encontrada en respuesta del SII');
        
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Error obteniendo semilla: ${message}`);
    }
}

// ✅ MÉTODO CORREGIDO PARA OBTENER TOKEN
export async function getToken(ambiente: 'CERT' | 'PROD', semillaFirmada: string): Promise<string> {
    console.log(`🎫 Obteniendo token del SII vía SOAP (${ambiente})...`);
    
    const urls = URLS_SII[ambiente];
    
    try {
        // ✅ VERIFICAR QUE EL XML CONTENGA EL CERTIFICADO ANTES DE ESCAPAR
        console.log('\n🔍 Verificando XML antes del envío SOAP...');
        if (semillaFirmada.includes('<X509Certificate>')) {
            console.log('✅ XML original contiene X509Certificate');
        } else if (semillaFirmada.includes('<Certificate>')) {
            console.log('✅ XML original contiene Certificate');
        } else {
            console.log('❌ XML original NO contiene ningún Certificate');
            console.log('📄 XML a enviar (primeros 1000 chars):');
            console.log(semillaFirmada.substring(0, 1000));
            throw new Error('XML no contiene certificado antes del envío');
        }
        
        // Escapar el XML firmado para incluirlo en SOAP
        const xmlEscapado = escapeXml(semillaFirmada);
        
        // ✅ VERIFICAR EL XML ESCAPADO
        console.log('🔍 XML después del escapado (primeros 500 chars):');
        console.log(xmlEscapado.substring(0, 500));
        
        const soapBody = buildSoapEnvelope('getToken', {
            pszXml: xmlEscapado
        });
        
        console.log(`📄 SOAP Body (primeros 1000 chars): ${soapBody.substring(0, 1000)}...`);
        
        // ✅ GUARDAR EL SOAP BODY COMPLETO PARA INSPECCIÓN
        const fs = require('fs');
        fs.writeFileSync('debug-soap-request.xml', soapBody);
        console.log('💾 SOAP Request guardado en: debug-soap-request.xml');
        
        const response = await fetchSOAPConReintentos(urls.token, soapBody);
        
        console.log(`📄 Respuesta SOAP completa: ${response}`);
        
        // Extraer el token de la respuesta
        const tokenXML = extractSOAPResponse(response, 'getToken');
        
        if (tokenXML) {
            // Decodificar entidades HTML si es necesario
            const tokenDecodificado = tokenXML
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&amp;/g, '&');
            
            console.log(`📄 Token XML decodificado: ${tokenDecodificado}`);
            
            // Extraer el token real del XML de respuesta
            const match = tokenDecodificado.match(/<SII:RESPUESTA[^>]*>[\s\S]*?<SII:RESP_HDR>[\s\S]*?<ESTADO>([^<]+)<\/ESTADO>/);
            
            if (match && match[1] === '00') {
                // Buscar el token en el cuerpo de la respuesta
                const tokenMatch = tokenDecodificado.match(/<TOKEN>([^<]+)<\/TOKEN>/);
                if (tokenMatch) {
                    const token = tokenMatch[1];
                    console.log(`✅ Token válido obtenido: ${token}`);
                    return token;
                }
            } else if (match && match[1] !== '00') {
                // Hay un error en la respuesta
                const glosMatch = tokenDecodificado.match(/<GLOSA>([^<]+)<\/GLOSA>/);
                const glosa = glosMatch ? glosMatch[1] : 'Error desconocido';
                throw new Error(`Error del SII (Estado ${match[1]}): ${glosa}`);
            }
            
            throw new Error('Token no encontrado en respuesta válida del SII');
        }
        
        throw new Error('No se pudo extraer respuesta del SOAP');

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Error obteniendo token: ${message}`);
    }
}

export async function testConectividad(ambiente: 'CERT' | 'PROD' = 'CERT'): Promise<boolean> {
    try {
        console.log(`🧪 Probando conectividad SII (${ambiente})...`);
        
        const urls = URLS_SII[ambiente];
        const soapBody = buildSoapEnvelope('getVersion');
        
        const response = await fetchSOAPConReintentos(urls.query, soapBody);
        const version = extractSOAPResponse(response, 'getVersion');
        
        if (version) {
            console.log(`✅ Conectividad OK - Versión SII: ${version}`);
            return true;
        }
        
        return false;

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.log(`❌ Error de conectividad: ${message}`);
        return false;
    }
}

// ✅ MÉTODO ALTERNATIVO CON CDATA PARA EVITAR ESCAPADO
export async function getTokenConCDATA(ambiente: 'CERT' | 'PROD', semillaFirmada: string): Promise<string> {
    console.log(`🎫 Obteniendo token con CDATA (${ambiente})...`);
    
    const urls = URLS_SII[ambiente];
    
    try {
        // En lugar de escapar, usar CDATA
        const soapBodyCDATA = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:impl="http://DefaultNamespace">
    <soapenv:Header/>
    <soapenv:Body>
        <getToken xmlns="http://DefaultNamespace">
            <pszXml><![CDATA[${semillaFirmada}]]></pszXml>
        </getToken>
    </soapenv:Body>
</soapenv:Envelope>`;
        
        console.log(`📄 SOAP Body con CDATA (primeros 800 chars): ${soapBodyCDATA.substring(0, 800)}...`);
        
        const response = await fetchSOAPConReintentos(urls.token, soapBodyCDATA);
        
        console.log(`📄 Respuesta SOAP completa: ${response}`);
        
        // Procesar respuesta igual que antes
        const tokenXML = extractSOAPResponse(response, 'getToken');
        
        if (tokenXML) {
            const tokenDecodificado = tokenXML
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&amp;/g, '&');
            
            console.log(`📄 Token XML decodificado: ${tokenDecodificado}`);
            
            const match = tokenDecodificado.match(/<SII:RESPUESTA[^>]*>[\s\S]*?<SII:RESP_HDR>[\s\S]*?<ESTADO>([^<]+)<\/ESTADO>/);
            
            if (match && match[1] === '00') {
                const tokenMatch = tokenDecodificado.match(/<TOKEN>([^<]+)<\/TOKEN>/);
                if (tokenMatch) {
                    const token = tokenMatch[1];
                    console.log(`✅ Token válido obtenido con CDATA: ${token}`);
                    return token;
                }
            } else if (match && match[1] !== '00') {
                const glosMatch = tokenDecodificado.match(/<GLOSA>([^<]+)<\/GLOSA>/);
                const glosa = glosMatch ? glosMatch[1] : 'Error desconocido';
                throw new Error(`Error del SII con CDATA (Estado ${match[1]}): ${glosa}`);
            }
            
            throw new Error('Token no encontrado en respuesta válida del SII con CDATA');
        }
        
        throw new Error('No se pudo extraer respuesta del SOAP con CDATA');

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Error obteniendo token con CDATA: ${message}`);
    }
}