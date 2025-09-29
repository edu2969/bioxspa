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

export class DigitalSigner {
  private certificate: forge.pki.Certificate;
  private privateKey: forge.pki.PrivateKey;

  constructor(pfxBase64?: string, pfxPassword?: string) {
    try {
      // Usar certificado desde variables de entorno
      const certBase64 = pfxBase64 || process.env.PFX_BASE64;
      const password = pfxPassword || process.env.PFX_PASS;

      if (!certBase64) {
        throw new Error('No se encontró PFX_BASE64 en variables de entorno');
      }

      console.log('🔐 Cargando certificado PFX...');

      // Decodificar el PFX desde Base64
      const pfxBuffer = forge.util.decode64(certBase64);
      const pfxAsn1 = forge.asn1.fromDer(pfxBuffer);
      const pfx = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, password);

      // Extraer certificado
      const bags = pfx.getBags({ bagType: forge.pki.oids.certBag });
      const certBag = bags[forge.pki.oids.certBag]?.[0];
      
      if (!certBag?.cert) {
        throw new Error('No se pudo extraer el certificado del PFX');
      }
      
      this.certificate = certBag.cert;

      // Extraer llave privada
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
      // Cast privateKey to RSA key to access sign method
      const rsaPrivateKey = this.privateKey as forge.pki.rsa.PrivateKey;
      const signature = rsaPrivateKey.sign(md, 'RSASSA-PKCS1-V1_5');
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
    // Obtener el certificado en formato DER y codificarlo en Base64
    const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(this.certificate));
    const certBase64 = forge.util.encode64(certDer.getBytes());
    
    // Obtener módulo y exponente de la clave pública
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
    // Canonicalización simple para cumplir con C14N
    return xml
      .replace(/\s+/g, ' ')           // Normalizar espacios
      .replace(/>\s+</g, '><')        // Quitar espacios entre elementos
      .replace(/\s+>/g, '>')          // Quitar espacios antes de cierre
      .replace(/\s+\/>/g, '/>')       // Quitar espacios en elementos auto-cerrados
      .trim();
  }

  /**
   * Obtener información del certificado
   */
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
}