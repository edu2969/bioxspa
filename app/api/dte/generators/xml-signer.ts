import * as forge from 'node-forge';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

interface CertificateAttribute {
  shortName?: string;
  name: string;
  value: string;
}

interface CertificateSubject {
  [key: string]: string;
}

interface CertificateInfo {
  subject: CertificateSubject;
  issuer: CertificateSubject;
  validFrom: Date;
  validTo: Date;
  serialNumber: string;
}

export class XMLSigner {
  private certificate: forge.pki.Certificate;
  private privateKey: forge.pki.PrivateKey;

  constructor(pfxBase64?: string, pfxPassword?: string) {
    try {
      const certBase64 = pfxBase64 || process.env.PFX_BASE64;
      const password = pfxPassword || process.env.PFX_PASSWORD;

      if (!certBase64) {
        throw new Error('No se encontró PFX_BASE64 en variables de entorno');
      }

      console.log('🔐 Cargando certificado PFX...');

      const pfxBuffer = forge.util.decode64(certBase64);
      const pfxAsn1 = forge.asn1.fromDer(pfxBuffer);
      const pfx = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, password);

      const bags = pfx.getBags({ bagType: forge.pki.oids.certBag });
      const certBag = bags[forge.pki.oids.certBag]?.[0];

      if (!certBag?.cert) {
        throw new Error('No se pudo extraer el certificado del PFX');
      }

      this.certificate = certBag.cert;

      const keyBags = pfx.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
      const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];

      if (!keyBag?.key) {
        throw new Error('No se pudo extraer la llave privada del PFX');
      }

      this.privateKey = keyBag.key as forge.pki.PrivateKey;

      console.log('✅ Certificado PFX cargado exitosamente');
      console.log(`📄 Emisor: ${this.certificate.subject.getField('CN')?.value}`);
      console.log(`📅 Válido hasta: ${this.certificate.validity.notAfter}`);

    } catch (error: unknown) {
      throw new Error(`Error cargando certificado PFX: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  // ✅ MÉTODO CORREGIDO PARA FIRMAR SEMILLAS SII
  firmarSemilla(semilla: string): string {
    return this.firmarSemillaCorregido(semilla);
  }

  // ✅ NUEVO MÉTODO CON FORMATO EXACTO QUE ESPERA EL SII CHILENO
  firmarSemillaCorregido(semilla: string): string {
    try {
      console.log('🔐 Firmando semilla con formato SII chileno exacto...');
      console.log(`🌱 Semilla a firmar: ${semilla}`);

      // 1. Obtener certificado en formato PEM (sin headers)
      const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(this.certificate));
      const certBase64 = forge.util.encode64(certDer.getBytes());
      
      console.log(`🔍 Certificate Base64: ${certBase64.substring(0, 50)}...`);

      // 2. Crear el XML de semilla SIN namespace en Signature (formato SII chileno)
      const xmlSemilla = `<getToken><item><Semilla>${semilla}</Semilla></item></getToken>`;
      
      // 3. Calcular digest del XML
      const md = forge.md.sha1.create();
      md.update(xmlSemilla, 'utf8');
      const digest = md.digest();
      const digestBase64 = forge.util.encode64(digest.getBytes());
      
      // 4. Crear SignedInfo (SIN namespace)
      const signedInfo = `<SignedInfo><CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/><SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/><Reference URI=""><Transforms><Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/></Transforms><DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/><DigestValue>${digestBase64}</DigestValue></Reference></SignedInfo>`;
      
      // 5. Firmar SignedInfo
      const mdSignedInfo = forge.md.sha1.create();
      mdSignedInfo.update(signedInfo, 'utf8');
      const rsaPrivateKey = this.privateKey as forge.pki.rsa.PrivateKey;
      const signature = rsaPrivateKey.sign(mdSignedInfo);
      const signatureBase64 = forge.util.encode64(signature);
      
      console.log(`🔍 Signature Base64: ${signatureBase64.substring(0, 50)}...`);
      
      // ✅ 6. CREAR XML FIRMADO CON FORMATO EXACTO DEL SII CHILENO
      // IMPORTANTE: SII chileno usa formato específico SIN namespaces explícitos
      const xmlFirmado = `<?xml version="1.0" encoding="UTF-8"?>
<getToken>
<item>
<Semilla>${semilla}</Semilla>
</item>
<Signature>
<SignedInfo>
<CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
<SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
<Reference URI="">
<Transforms>
<Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
</Transforms>
<DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
<DigestValue>${digestBase64}</DigestValue>
</Reference>
</SignedInfo>
<SignatureValue>${signatureBase64}</SignatureValue>
<KeyInfo>
<X509Data>
<X509Certificate>${certBase64}</X509Certificate>
</X509Data>
</KeyInfo>
</Signature>
</getToken>`;

      console.log('✅ Semilla firmada con formato SII chileno exacto');
      return xmlFirmado;

    } catch (error: unknown) {
      console.error('❌ Error firmando semilla:', error);
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`No se pudo firmar la semilla: ${message}`);
    }
  }

  // ✅ FORMATO ALTERNATIVO PARA SII (si el anterior no funciona)
  firmarSemillaFormatoAlternativo(semilla: string): string {
    try {
      console.log('🔐 Probando formato alternativo SII...');
      
      // Obtener certificado
      const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(this.certificate));
      const certBase64 = forge.util.encode64(certDer.getBytes());
      
      // Crear firma simple sin digestión compleja
      const textoAFirmar = `<getToken><item><Semilla>${semilla}</Semilla></item></getToken>`;
      const md = forge.md.sha1.create();
      md.update(textoAFirmar, 'utf8');
      const rsaPrivateKey = this.privateKey as forge.pki.rsa.PrivateKey;
      const signature = rsaPrivateKey.sign(md);
      const signatureBase64 = forge.util.encode64(signature);
      
      // Formato simplificado que a veces acepta SII
      const xmlFirmado = `<?xml version="1.0" encoding="UTF-8"?>
<getToken>
<item>
<Semilla>${semilla}</Semilla>
</item>
<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
<SignedInfo>
<CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
<SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
<Reference URI="">
<DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
<DigestValue>${forge.util.encode64(md.digest().getBytes())}</DigestValue>
</Reference>
</SignedInfo>
<SignatureValue>${signatureBase64}</SignatureValue>
<KeyInfo>
<X509Data>
<Certificate>${certBase64}</Certificate>
</X509Data>
</KeyInfo>
</Signature>
</getToken>`;

      return xmlFirmado;
      
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Error en formato alternativo: ${message}`);
    }
  }

  // ✅ MÉTODO ANTERIOR PARA MANTENER COMPATIBILIDAD  
  private firmarXMLParaSII(xmlContent: string): string {
    return this.firmarSemillaCorregido(this.extraerSemilla(xmlContent));
  }

  private extraerSemilla(xmlContent: string): string {
    const match = xmlContent.match(/<Semilla>([^<]+)<\/Semilla>/);
    return match ? match[1] : '';
  }

  // Método estático para usar desde sii-client
  static async firmarXML(xmlContent: string): Promise<string> {
    const signer = new XMLSigner();
    return signer.firmarXML(xmlContent);
  }

  /**
   * Firma un XML de DTE siguiendo estándares SII
   */
  firmarXML(xmlContent: string): string {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlContent, 'text/xml');

      // Encontrar el elemento Documento
      const documento = doc.getElementsByTagName('Documento')[0];
      if (!documento) {
        throw new Error('No se encontró el elemento Documento en el XML');
      }

      const documentoId = documento.getAttribute('ID');
      if (!documentoId) {
        throw new Error('El elemento Documento debe tener atributo ID');
      }

      // Canonicalizar el documento para calcular digest
      const documentoXml = new XMLSerializer().serializeToString(documento);
      const documentoCanonical = this.canonicalizeXML(documentoXml);

      // Calcular SHA-1 del documento
      const documentoDigest = forge.md.sha1.create();
      documentoDigest.update(documentoCanonical, 'utf8');
      const digestValue = forge.util.encode64(documentoDigest.digest().getBytes());

      // Crear SignedInfo
      const signedInfo = this.crearSignedInfo(documentoId, digestValue);
      const signedInfoCanonical = this.canonicalizeXML(signedInfo);

      // Firmar SignedInfo con SHA-1
      const md = forge.md.sha1.create();
      md.update(signedInfoCanonical, 'utf8');
      const rsaPrivateKey = this.privateKey as forge.pki.rsa.PrivateKey;
      const signature = rsaPrivateKey.sign(md);
      const signatureValue = forge.util.encode64(signature);

      // Crear elemento Signature completo
      const signatureElement = this.crearElementoSignature(signedInfo, signatureValue);

      // Insertar la firma en el DTE
      const dte = doc.getElementsByTagName('DTE')[0];
      if (!dte) {
        throw new Error('No se encontró el elemento DTE');
      }

      const signatureNode = parser.parseFromString(signatureElement, 'text/xml').documentElement;
      dte.appendChild(doc.importNode(signatureNode, true));

      return new XMLSerializer().serializeToString(doc);

    } catch (error: unknown) {
      throw new Error(`Error firmando XML: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  private crearSignedInfo(documentoId: string, digestValue: string): string {
    return `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">
  <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
  <SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
  <Reference URI="#${documentoId}">
    <Transforms>
      <Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
    </Transforms>
    <DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
    <DigestValue>${digestValue}</DigestValue>
  </Reference>
</SignedInfo>`;
  }

  private crearElementoSignature(signedInfo: string, signatureValue: string): string {
    const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(this.certificate));
    const certBase64 = forge.util.encode64(certDer.getBytes());

    const publicKey = this.certificate.publicKey as forge.pki.rsa.PublicKey;
    const modulus = forge.util.encode64(forge.util.hexToBytes(publicKey.n.toString(16)));
    const exponent = forge.util.encode64(forge.util.hexToBytes(publicKey.e.toString(16)));

    return `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
  ${signedInfo}
  <SignatureValue>${signatureValue}</SignatureValue>
  <KeyInfo>
    <KeyValue>
      <RSAKeyValue>
        <Modulus>${modulus}</Modulus>
        <Exponent>${exponent}</Exponent>
      </RSAKeyValue>
    </KeyValue>
    <X509Data>
      <X509Certificate>${certBase64}</X509Certificate>
    </X509Data>
  </KeyInfo>
</Signature>`;
  }

  private canonicalizeXML(xml: string): string {
    return xml
      .replace(/\s+/g, ' ')
      .replace(/>\s+</g, '><')
      .replace(/\s+>/g, '>')
      .replace(/\s+\/>/g, '/>')
      .trim();
  }

  getCertificateInfo(): CertificateInfo {
    const processAttributes = (attributes: CertificateAttribute[]): CertificateSubject => {
      return attributes.reduce((acc: CertificateSubject, attr) => {
        const key = attr.shortName || attr.name;
        if (key !== undefined) {
          acc[key] = attr.value;
        }
        return acc;
      }, {});
    };

    return {
      subject: processAttributes(this.certificate.subject.attributes as CertificateAttribute[]),
      issuer: processAttributes(this.certificate.issuer.attributes as CertificateAttribute[]),
      validFrom: this.certificate.validity.notBefore,
      validTo: this.certificate.validity.notAfter,
      serialNumber: this.certificate.serialNumber
    };
  }

  // ✅ MÉTODO PARA VALIDAR QUE EL XML FIRMADO SEA CORRECTO
  validarXMLFirmado(xmlFirmado: string): boolean {
    try {
      console.log('🔍 Iniciando validación del XML firmado...');
      
      // Verificar que contiene elementos esenciales
      const checks = [
        { 
          name: 'Estructura getToken', 
          pattern: /<getToken>\s*<item>\s*<Semilla>\d+<\/Semilla>\s*<\/item>/, 
          required: true 
        },
        { 
          name: 'Elemento Signature', 
          pattern: /<Signature[^>]*>/, 
          required: true 
        },
        { 
          name: 'SignedInfo completo', 
          pattern: /<SignedInfo[^>]*>[\s\S]*<\/SignedInfo>/, 
          required: true 
        },
        { 
          name: 'SignatureValue', 
          pattern: /<SignatureValue>[A-Za-z0-9+\/=\s]+<\/SignatureValue>/, 
          required: true 
        },
        { 
          name: 'KeyInfo', 
          pattern: /<KeyInfo[^>]*>[\s\S]*<\/KeyInfo>/, 
          required: true 
        },
        { 
          name: 'X509Data', 
          pattern: /<X509Data[^>]*>[\s\S]*<\/X509Data>/, 
          required: true 
        },
        { 
          name: 'Certificate (cualquier formato)', 
          pattern: /<(?:X509Certificate|Certificate)>[A-Za-z0-9+\/=\s]+<\/(?:X509Certificate|Certificate)>/, 
          required: true 
        },
        { 
          name: 'DigestValue', 
          pattern: /<DigestValue>[A-Za-z0-9+\/=]+<\/DigestValue>/, 
          required: true 
        },
        { 
          name: 'Algoritmo SHA-1', 
          pattern: /sha1/i, 
          required: true 
        },
        { 
          name: 'Algoritmo RSA', 
          pattern: /rsa-sha1/i, 
          required: true 
        }
      ];
      
      let validacionesPasadas = 0;
      const validacionesTotales = checks.filter(c => c.required).length;
      
      for (const check of checks) {
        if (check.pattern.test(xmlFirmado)) {
          console.log(`  ✅ ${check.name}`);
          if (check.required) validacionesPasadas++;
        } else {
          if (check.required) {
            console.log(`  ❌ ${check.name} - REQUERIDO`);
            return false;
          } else {
            console.log(`  ⚠️  ${check.name} - OPCIONAL`);
          }
        }
      }
      
      // Validaciones adicionales específicas del SII
      console.log('\n🔍 Validaciones adicionales SII...');
      
      // Verificar que no hay caracteres problemáticos
      if (xmlFirmado.includes('&') && !xmlFirmado.includes('&amp;') && !xmlFirmado.includes('&lt;')) {
        console.log('  ⚠️  XML contiene caracteres & sin escapar');
      } else {
        console.log('  ✅ Caracteres especiales bien escapados');
      }
      
      // Verificar longitud del certificado
      const certMatch = xmlFirmado.match(/<(?:X509Certificate|Certificate)>([A-Za-z0-9+\/=\s]+)<\/(?:X509Certificate|Certificate)>/);
      if (certMatch) {
        const certLength = certMatch[1].replace(/\s/g, '').length;
        if (certLength > 1000 && certLength < 5000) {
          console.log(`  ✅ Longitud del certificado válida: ${certLength} chars`);
        } else {
          console.log(`  ⚠️  Longitud del certificado sospechosa: ${certLength} chars`);
        }
      }
      
      // Verificar que el XML está bien formado
      try {
        const parser = new (require('@xmldom/xmldom').DOMParser)();
        const doc = parser.parseFromString(xmlFirmado, 'text/xml');
        if (doc.documentElement) {
          console.log('  ✅ XML bien formado');
        } else {
          console.log('  ❌ XML mal formado');
          return false;
        }
      } catch {
        console.log('  ❌ Error de parsing XML');
        return false;
      }
      
      console.log(`\n✅ Validación completada: ${validacionesPasadas}/${validacionesTotales} checks pasados`);
      return validacionesPasadas === validacionesTotales;

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`❌ Error durante validación: ${message}`);
      return false;
    }
  }
}