import https from 'https';

const URLS_SII = {
    CERT: {
        upload: 'https://maullin.sii.cl/cgi_dte/UPL/DTEUpload'
    },
    PROD: {
        upload: 'https://palena.sii.cl/cgi_dte/UPL/DTEUpload'
    }
};

export async function dteUpload(
    ambiente: 'CERT' | 'PROD',
    token: string,
    rutEmisor: string,
    rutCompania: string,
    xmlEnvio: string
): Promise<string> {
    console.log(`📤 Enviando DTE al SII (${ambiente})...`);
    console.log(`   🔑 Token: ${token}`);
    console.log(`   🏢 RUT Emisor: ${rutEmisor}`);
    console.log(`   📦 XML Size: ${xmlEnvio.length} bytes`);
    
    const urls = URLS_SII[ambiente];
    
    return new Promise((resolve, reject) => {
        // ✅ FORMATO EXACTO QUE FUNCIONA CON SII
        const boundary = `----formdata-bioxspa-${Date.now()}`;
        
        // ✅ CONSTRUIR FORM-DATA CON FORMATO CLÁSICO
        const formDataLines = [
            `--${boundary}`,
            'Content-Disposition: form-data; name="token"',
            '',
            token,
            `--${boundary}`,
            'Content-Disposition: form-data; name="rutSender"',
            '',
            rutEmisor,
            `--${boundary}`,
            'Content-Disposition: form-data; name="rutCompany"',
            '',
            rutCompania,
            `--${boundary}`,
            'Content-Disposition: form-data; name="archivo"; filename="envio.xml"',
            'Content-Type: text/xml',
            '',
            xmlEnvio,
            `--${boundary}--`,
            ''
        ];
        
        const formData = formDataLines.join('\r\n');
        
        console.log(`   📋 Boundary: ${boundary}`);
        console.log(`   📋 Content-Length: ${Buffer.byteLength(formData)}`);
        console.log(`   📄 Form-data preview:`);
        console.log(formData.substring(0, 500));
        
        const parsed = new URL(urls.upload);
        const options: https.RequestOptions = {
            hostname: parsed.hostname,
            port: 443,
            path: parsed.pathname,
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': Buffer.byteLength(formData),
                'User-Agent': 'BIOXSPA-DTE-Client/1.0',
                'Accept': 'text/html,application/xhtml+xml,application/xml',
                'Connection': 'close'
            }
        };
        
        console.log(`   🌐 URL: ${urls.upload}`);
        
        const req = https.request(options, (res) => {
            console.log(`   📊 Upload Status: ${res.statusCode} ${res.statusMessage}`);
            
            const chunks: Buffer[] = [];
            res.on('data', (chunk) => {
                chunks.push(chunk);
                console.log(`   📥 Chunk: ${chunk.length} bytes`);
            });
            
            res.on('end', () => {
                const response = Buffer.concat(chunks).toString();
                console.log(`   📄 Upload Response (${response.length} chars):`);
                console.log(`   📄 ${'-'.repeat(40)}`);
                console.log(response);
                console.log(`   📄 ${'-'.repeat(40)}`);
                
                // ✅ GUARDAR RESPUESTA
                const fs = require('fs');
                fs.writeFileSync('debug-upload-response.txt', response);
                console.log('   💾 Respuesta guardada en: debug-upload-response.txt');
                
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode}: ${response}`));
                    return;
                }
                
                // ✅ DETECTAR ERROR 501 ptr NULL
                if (response.includes('ERROR : 501') && response.includes('ptr NULL')) {
                    reject(new Error('Error SII 501: Token no reconocido por el servidor'));
                    return;
                }
                
                // ✅ DETECTAR OTROS ERRORES
                if (response.includes('ERROR') || response.includes('Error')) {
                    const errorMatch = response.match(/Error\s*:\s*([^<\n]+)/i);
                    const errorMsg = errorMatch ? errorMatch[1].trim() : 'Error del SII';
                    reject(new Error(`Error del SII: ${errorMsg}`));
                    return;
                }
                
                // Extraer Track ID de la respuesta
                const patterns = [
                    /TRACKID[^0-9]*([0-9]+)/i,
                    /Track\s*ID\s*[:\s]*([0-9]+)/i,
                    /numero\s*de\s*envio[^0-9]*([0-9]+)/i,
                    /([0-9]{8,})/g
                ];
                
                console.log('   🔍 Buscando Track ID...');
                for (const pattern of patterns) {
                    const matches = response.match(pattern);
                    if (matches) {
                        const trackId = pattern.global ? 
                            matches.find(m => m.length >= 8) : 
                            matches[1];
                            
                        if (trackId && trackId.length >= 6) {
                            console.log(`   ✅ Track ID encontrado: ${trackId}`);
                            resolve(trackId);
                            return;
                        }
                    }
                }
                
                // Si no hay errores ni Track ID, puede ser exitoso
                if (response.toLowerCase().includes('recibido') || 
                    response.toLowerCase().includes('ok')) {
                    console.log('   ⚠️  Envío parece exitoso pero sin Track ID');
                    resolve('SUCCESS_NO_TRACKID');
                    return;
                }
                
                reject(new Error('No se encontró Track ID en respuesta del SII'));
            });
        });
        
        req.on('error', (error) => {
            console.error(`   ❌ Error en upload: ${error.message}`);
            reject(error);
        });
        
        req.on('timeout', () => {
            console.error('   ❌ Timeout en upload');
            req.destroy();
            reject(new Error('Timeout en upload'));
        });
        
        console.log('   📤 Enviando form-data...');
        req.write(formData);
        req.end();
        console.log('   ✅ Upload enviado');
    });
}