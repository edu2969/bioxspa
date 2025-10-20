import https from "https";
import { setTimeout } from "timers/promises";

const WSDL_URL = "https://maullin.sii.cl/DTEWS/QueryEstUp.jws?WSDL";
const NS = "http://DefaultNamespace";
const FETCH_TIMEOUT = 30000; // Aumentar timeout
const MAX_REINTENTOS = 3;
const DELAY_ENTRE_REINTENTOS = 5000; // 5 segundos

// Horarios recomendados para usar servicios SII
function esHorarioOptimo(): boolean {
    const ahora = new Date();
    const hora = ahora.getHours();
    const diaSemana = ahora.getDay(); // 0 = domingo, 6 = sábado
    
    // Evitar fines de semana y horarios de alta demanda
    if (diaSemana === 0 || diaSemana === 6) return false;
    if (hora < 8 || hora > 18) return false; // Solo horario comercial
    if (hora >= 12 && hora <= 14) return false; // Evitar hora de almuerzo
    
    return true;
}

async function fetchTextConReintentos(url: string, timeout = FETCH_TIMEOUT): Promise<string> {
    let ultimoError: Error | null = null;
    
    for (let intento = 1; intento <= MAX_REINTENTOS; intento++) {
        try {
            console.log(`🔄 Intento ${intento}/${MAX_REINTENTOS} - ${url}`);
            
            const resultado = await new Promise<string>((resolve, reject) => {
                const req = https.get(url, {
                    timeout,
                    headers: {
                        'User-Agent': 'BIOXSPA-DTE-Client/1.0',
                        'Accept': 'text/xml,application/xml',
                        'Connection': 'keep-alive'
                    }
                }, (res) => {
                    console.log(`   📊 Status: ${res.statusCode} ${res.statusMessage}`);
                    console.log(`   📋 Headers:`, res.headers);
                    
                    if (res.statusCode === 503) {
                        reject(new Error(`Servicio no disponible (503) - Intento ${intento}`));
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
                    reject(new Error(`Timeout después de ${timeout}ms`));
                });
            });
            
            console.log(`   ✅ Éxito en intento ${intento}`);
            return resultado;
            
        } catch (error: any) {
            ultimoError = error;
            console.log(`   ❌ Error en intento ${intento}: ${error.message}`);
            
            if (intento < MAX_REINTENTOS) {
                console.log(`   ⏰ Esperando ${DELAY_ENTRE_REINTENTOS}ms antes del siguiente intento...`);
                await setTimeout(DELAY_ENTRE_REINTENTOS);
            }
        }
    }
    
    throw ultimoError || new Error('Todos los intentos fallaron');
}

async function postXmlConReintentos(url: string, xml: string, timeout = FETCH_TIMEOUT): Promise<{ status: number; body: string; headers: any }> {
    let ultimoError: Error | null = null;
    
    for (let intento = 1; intento <= MAX_REINTENTOS; intento++) {
        try {
            console.log(`🔄 POST Intento ${intento}/${MAX_REINTENTOS}`);
            
            const resultado = await new Promise<{ status: number; body: string; headers: any }>((resolve, reject) => {
                const parsed = new URL(url);
                const opts: https.RequestOptions = {
                    hostname: parsed.hostname,
                    port: parsed.port || 443,
                    path: parsed.pathname + parsed.search,
                    method: "POST",
                    headers: {
                        "Content-Type": "text/xml; charset=utf-8",
                        "Content-Length": Buffer.byteLength(xml),
                        "SOAPAction": '""',
                        "User-Agent": "BIOXSPA-DTE-Client/1.0",
                        "Accept": "text/xml,application/xml",
                        "Connection": "keep-alive"
                    },
                    timeout,
                };
                
                const req = https.request(opts, (res) => {
                    console.log(`   📊 POST Status: ${res.statusCode} ${res.statusMessage}`);
                    
                    if (res.statusCode === 503) {
                        reject(new Error(`Servicio no disponible (503) - POST Intento ${intento}`));
                        return;
                    }
                    
                    const chunks: Buffer[] = [];
                    res.on("data", (c) => chunks.push(c));
                    res.on("end", () => resolve({ 
                        status: res.statusCode || 0, 
                        body: Buffer.concat(chunks).toString("utf8"), 
                        headers: res.headers 
                    }));
                });
                
                req.on("error", reject);
                req.on("timeout", () => {
                    req.destroy();
                    reject(new Error(`POST Timeout después de ${timeout}ms`));
                });
                
                req.write(xml);
                req.end();
            });
            
            console.log(`   ✅ POST Éxito en intento ${intento}`);
            return resultado;
            
        } catch (error: any) {
            ultimoError = error;
            console.log(`   ❌ POST Error en intento ${intento}: ${error.message}`);
            
            if (intento < MAX_REINTENTOS) {
                console.log(`   ⏰ Esperando ${DELAY_ENTRE_REINTENTOS}ms antes del siguiente intento...`);
                await setTimeout(DELAY_ENTRE_REINTENTOS);
            }
        }
    }
    
    throw ultimoError || new Error('Todos los intentos POST fallaron');
}

// ... (mantener las otras funciones: extractEndpoint, extractOperations, etc.)

function extractEndpoint(wsdl: string): string | null {
    const m = wsdl.match(/<wsdlsoap:address[^>]*location="([^"]+)"/i);
    return m ? m[1] : null;
}

function extractOperations(wsdl: string): string[] {
    const ops: string[] = [];
    const ptMatch = wsdl.match(/<portType[^>]*name="[^"]*"[^>]*>([\s\S]*?)<\/portType>/i);
    const body = ptMatch ? ptMatch[1] : wsdl;
    const re = /<operation\s+name="([^"]+)"/gi;
    let m;
    while ((m = re.exec(body))) ops.push(m[1]);
    return ops;
}

function buildSoapEnvelope(operation: string, params: Record<string, string | undefined>): string {
    const bodyParams = Object.keys(params)
        .map((k) => `<${k}>${escapeXml(params[k] ?? "")}</${k}>`)
        .join("");
    const body =
        bodyParams.length > 0
            ? `<${operation} xmlns="${NS}">${bodyParams}</${operation}>`
            : `<${operation} xmlns="${NS}" />`;
    return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:impl="${NS}">
    <soapenv:Header/>
    <soapenv:Body>
        ${body}
    </soapenv:Body>
</soapenv:Envelope>`;
}

function escapeXml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

async function main() {
    console.log('🕐 Verificando horario óptimo...');
    if (!esHorarioOptimo()) {
        console.log('⚠️  ADVERTENCIA: No es horario óptimo para servicios SII');
        console.log('📅 Horario recomendado: Lunes a Viernes, 8:00-12:00 o 14:00-18:00');
        console.log('🔄 Continuando de todas formas...\n');
    } else {
        console.log('✅ Horario óptimo para servicios SII\n');
    }
    
    console.log("🌐 Descargando WSDL:", WSDL_URL);
    
    let wsdl: string;
    try {
        wsdl = await fetchTextConReintentos(WSDL_URL);
        console.log(`📄 WSDL descargado exitosamente (${wsdl.length} caracteres)\n`);
    } catch (err) {
        console.error("❌ ERROR: no se pudo descargar WSDL después de múltiples intentos:", err);
        console.log("\n💡 Posibles soluciones:");
        console.log("1. Reintentar en horario comercial (8:00-18:00, Lun-Vie)");
        console.log("2. Verificar conectividad a internet");
        console.log("3. Los servicios SII pueden estar en mantención");
        console.log("4. Usar VPN si hay restricciones geográficas");
        process.exit(1);
        return;
    }

    const endpoint = extractEndpoint(wsdl);
    if (!endpoint) {
        console.error("❌ ERROR: no se pudo extraer endpoint del WSDL.");
        process.exit(1);
        return;
    }
    console.log("🎯 Endpoint detectado:", endpoint);

    const operations = extractOperations(wsdl);
    if (operations.length === 0) {
        console.error("❌ ERROR: no se detectaron operaciones en el WSDL.");
        process.exit(1);
        return;
    }

    console.log("🔧 Operaciones detectadas:", operations.join(", "));
    console.log("");

    // Solo probar una operación simple primero
    const operacionPrueba = operations.find(op => 
        op.toLowerCase().includes('version') || 
        op.toLowerCase().includes('state') ||
        op.toLowerCase().includes('ping')
    ) || operations[0];

    console.log(`🧪 Probando operación simple: ${operacionPrueba}`);
    
    try {
        const envelope = buildSoapEnvelope(operacionPrueba, {});
        const res = await postXmlConReintentos(endpoint, envelope);
        
        console.log(`✅ Respuesta obtenida para ${operacionPrueba}:`);
        console.log(`📊 Status: ${res.status}`);
        console.log(`📄 Body preview: ${res.body.substring(0, 300)}...`);
        
        if (res.status === 200) {
            console.log('\n🎉 ¡Conexión SOAP exitosa con SII!');
            console.log('🔥 Los servicios están disponibles');
        }
        
    } catch (error: any) {
        console.log(`❌ Error al probar ${operacionPrueba}:`, error.message);
        
        if (error.message.includes('503')) {
            console.log('\n📋 Servicios SII no disponibles (503)');
            console.log('🕐 Recomendaciones:');
            console.log('- Reintentar en 10-15 minutos');
            console.log('- Usar horario comercial');
            console.log('- Verificar estado de servicios SII en su sitio web');
        }
    }
}

main().catch((e) => {
    console.error("💥 Fallo inesperado:", e);
    process.exit(1);
});