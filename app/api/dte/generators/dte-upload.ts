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
    
    const urls = URLS_SII[ambiente];
    
    return new Promise((resolve, reject) => {
        const boundary = `----formdata-${Date.now()}`;
        const formData = [
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
        ].join('\r\n');
        
        const parsed = new URL(urls.upload);
        const options: https.RequestOptions = {
            hostname: parsed.hostname,
            port: 443,
            path: parsed.pathname,
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': Buffer.byteLength(formData),
                'User-Agent': 'BIOXSPA-DTE-Client/1.0'
            }
        };
        
        const req = https.request(options, (res) => {
            console.log(`📊 Upload Status: ${res.statusCode}`);
            
            const chunks: Buffer[] = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                const response = Buffer.concat(chunks).toString();
                console.log(`📄 Upload Response: ${response.substring(0, 200)}...`);
                
                // Extraer Track ID de la respuesta
                const trackIdMatch = response.match(/TRACKID[^0-9]*([0-9]+)/i);
                if (trackIdMatch) {
                    const trackId = trackIdMatch[1];
                    console.log(`✅ Track ID obtenido: ${trackId}`);
                    resolve(trackId);
                } else {
                    console.log('❌ No se encontró Track ID en respuesta');
                    reject(new Error('No se pudo extraer Track ID de la respuesta'));
                }
            });
        });
        
        req.on('error', (error) => {
            console.error('❌ Error en upload:', error);
            reject(error);
        });
        
        req.write(formData);
        req.end();
    });
}

// ✅ PRUEBA CON ENCODING LATIN1 (COMO USA EL SII)
/*async function uploadConEncodingLatin1(
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
    
    console.log(`📤 Upload con encoding LATIN1 (${ambiente})...`);
    
    return new Promise((resolve, reject) => {
        const boundary = '----formdata-latin1';
        
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
            `Content-Type: text/xml; charset=ISO-8859-1`,
            ``,
            xmlEnvio,
            `--${boundary}--`
        ];
        
        const body = parts.join('\r\n') + '\r\n';
        
        // ✅ CONVERTIR A LATIN1
        const bodyBuffer = Buffer.from(body, 'latin1');
        
        console.log(`   📋 LATIN1 Content-Length: ${bodyBuffer.length}`);
        console.log(`   📄 LATIN1 preview: ${body.substring(0, 300)}`);
        
        const url = new URL(urls[ambiente]);
        
        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}; charset=ISO-8859-1`,
                'Content-Length': bodyBuffer.length,
                'User-Agent': 'SII-Latin1-Client/1.0',
                'Accept': 'text/html,application/xml',
                'Accept-Charset': 'ISO-8859-1,utf-8;q=0.7,*;q=0.3'
            }
        };
        
        const req = https.request(options, (res) => {
            console.log(`   📊 LATIN1 Status: ${res.statusCode}`);
            
            const chunks: Buffer[] = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                const response = Buffer.concat(chunks).toString('latin1');
                console.log(`   📄 LATIN1 Response: ${response.substring(0, 500)}...`);
                
                if (response.includes('ERROR : 501')) {
                    reject(new Error('LATIN1: También falló con 501'));
                    return;
                }
                
                const trackMatch = response.match(/([0-9]{8,})/);
                if (trackMatch) {
                    resolve(trackMatch[1]);
                } else {
                    reject(new Error('LATIN1: Sin Track ID'));
                }
            });
        });
        
        req.on('error', reject);
        req.write(bodyBuffer);
        req.end();
    });
}*/