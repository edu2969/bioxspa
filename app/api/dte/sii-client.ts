// filepath: d:\git\bioxspa\app\api\dte\xml-signer.ts
// Clase mínima para firmar la semilla del SII.
// Requiere las dependencias: xml-crypto, xmldom (instálalas si no están).

import { SignedXml } from 'xml-crypto';
import { DOMParser } from 'xmldom';
import * as fs from 'fs';
import * as path from 'path';

export class XMLSigner {
    private certPem: string;
    private keyPem: string;

    constructor(certOrPath?: string, keyOrPath?: string) {
        // Prioridad: parámetros > variables de entorno (CERT_PEM / KEY_PEM) > archivos cert.pem / key.pem en repo
        const certEnv = certOrPath || process.env.CERT_PEM || this.tryReadFile(path.resolve(process.cwd(), 'cert.pem'));
        const keyEnv = keyOrPath || process.env.KEY_PEM || this.tryReadFile(path.resolve(process.cwd(), 'key.pem'));

        if (!certEnv) {
            throw new Error('No se encontró certificado (CERT_PEM o cert.pem).');
        }
        if (!keyEnv) {
            throw new Error('No se encontró clave privada (KEY_PEM o key.pem).');
        }

        this.certPem = this.normalizeCert(certEnv);
        this.keyPem = keyEnv.toString();
    }

    // Firmar la semilla: recibe el valor de SEMILLA y retorna XML con firma XMLDSig (envolvente)
    firmarSemilla(semilla: string): string {
        if (!semilla) throw new Error('Semilla vacía.');

        // Construir XML mínimo esperado por SII
        const plainXml = `<getSeed><SEMILLA>${this.escapeXml(semilla)}</SEMILLA></getSeed>`;

        // Preparar SignedXml
        const sig = new SignedXml();
        // Usar canonicalization y algoritmo por defecto de xml-crypto
        sig.addReference({
            xpath: "//*[local-name(.)='SEMILLA']",
            transforms: ['http://www.w3.org/2000/09/xmldsig#enveloped-signature'],
            digestAlgorithm: 'http://www.w3.org/2000/09/xmldsig#sha1' // SII suele aceptar SHA1 para firmas legacy
        });

        // Use a small local typed interface and cast via unknown to avoid explicit 'any'
        interface XmlCryptoSignerExt {
            signingKey?: string;
            keyInfoProvider?: { getKeyInfo(): string } | null;
        }
        (sig as unknown as XmlCryptoSignerExt).signingKey = this.keyPem;

        // Incluir certificado en KeyInfo (sin headers)
        const certBase64 = this.certPem.replace(/-----BEGIN CERTIFICATE-----/g, '')
                                                                     .replace(/-----END CERTIFICATE-----/g, '')
                                                                     .replace(/\r?\n|\r/g, '');
        const keyInfoProvider = { getKeyInfo: () => `<X509Data><X509Certificate>${certBase64}</X509Certificate></X509Data>` };
        (sig as unknown as XmlCryptoSignerExt).keyInfoProvider = keyInfoProvider;

        // Calcular firma
        sig.computeSignature(plainXml, {
            prefix: '',
            location: { reference: "//*[local-name(.)='SEMILLA']", action: 'after' }
        });

        const signedXml = sig.getSignedXml();

        // Asegurar que es un XML válido y devolverlo
        const doc = new DOMParser().parseFromString(signedXml, 'application/xml');
        const docStr = doc.toString();
        return docStr;
    }

    // Helpers
    private tryReadFile(p: string): string | null {
        try {
            if (fs.existsSync(p)) {
                return fs.readFileSync(p, 'utf-8');
            }
            return null;
        } catch {
            return null;
        }
    }

    private normalizeCert(cert: string): string {
        // Si el certificado viene en una sola línea sin headers, intentar normalizar
        let c = cert.trim();
        if (!c.includes('-----BEGIN CERTIFICATE-----')) {
            // Insert headers if missing
            c = '-----BEGIN CERTIFICATE-----\n' + c + '\n-----END CERTIFICATE-----';
        }
        return c;
    }

    private escapeXml(str: string): string {
        return str.replace(/&/g, '&amp;')
                            .replace(/</g, '&lt;')
                            .replace(/>/g, '&gt;')
                            .replace(/"/g, '&quot;')
                            .replace(/'/g, '&apos;');
    }
}
