import crypto from 'node:crypto';
import { DOMParser } from '@xmldom/xmldom';
import { XMLSerializer } from '@xmldom/xmldom';
import xpath from 'xpath';

export function loadPfx(/*pfxBase64: string, pass: string*/) {
  //const pfx = Buffer.from(pfxBase64, 'base64');
  // Node no expone pkcs12Export en todas las versiones; alternativa: usar node-forge o pkcs12-decode.
  // Para este starter, asumimos que obtienes PEMs por otro medio.
  throw new Error('pkcs12Export no está disponible. Usa node-forge, pkcs12-decode, o provee los PEMs directamente.');
}

export function signXmlEnveloped(xml: string, referenceXPath: string, privateKeyPem: string, certPem: string, algo: 'sha1' | 'sha256' = 'sha1') {
  // Firma XML-DSig minimalista: agrega <Signature> como hijo del nodo referenciado (enveloped)
  // Para producción, considera librerías maduras: xml-crypto, xadesjs, xmldsigjs.
  const doc = new DOMParser().parseFromString(xml);
  const target = xpath.select1(referenceXPath, doc) as Node;
  if (!target) throw new Error('Nodo de referencia no encontrado');

  // Canonicalize (muy simplificado; usa exclusive c14n real en prod)
  const c14n = new XMLSerializer().serializeToString(target);
  const digest = crypto.createHash(algo).update(Buffer.from(c14n, 'utf8')).digest('base64');

  const idAttr = (target as Element).getAttribute('ID') || '';
  const signedInfo = `
  <SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">
    <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
    <SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-${algo}"/>
    <Reference URI="#${idAttr}">
      <Transforms>
        <Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
        <Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
      </Transforms>
      <DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#${algo}"/>
      <DigestValue>${digest}</DigestValue>
    </Reference>
  </SignedInfo>`;

  const sign = crypto.createSign(algo === 'sha1' ? 'RSA-SHA1' : 'RSA-SHA256');
  sign.update(signedInfo);
  const signatureValue = sign.sign(privateKeyPem).toString('base64');

  const X509 = certPem.replace(/-----(BEGIN|END) CERTIFICATE-----/g, '').replace(/\s+/g, '');
  const signature = `
  <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
    ${signedInfo}
    <SignatureValue>${signatureValue}</SignatureValue>
    <KeyInfo>
      <X509Data><X509Certificate>${X509}</X509Certificate></X509Data>
    </KeyInfo>
  </Signature>`;

  (target as Element).appendChild(new DOMParser().parseFromString(signature).documentElement);
  return new XMLSerializer().serializeToString(doc);
}

export function signTedWithCaf(ddXml: string, rsaSkModulusBase64: string, rsaSkExponentBase64: string) {
  // Firma del TED (DD) usando la clave privada del CAF (RSASK). Aquí asumimos PKCS#1 v1.5 SHA1.
  const n = Buffer.from(rsaSkModulusBase64, 'base64');
  const d = Buffer.from(rsaSkExponentBase64, 'base64');
  // Para compatibilidad, pasamos un tercer parámetro vacío (o null) si no se usa.
  const keyPem = rsaPrivateKeyFromModExp(n, null, d);
  const key = crypto.createPrivateKey({ key: keyPem, format: 'pem', type: 'pkcs1' });
  const signer = crypto.createSign('RSA-SHA1');
  signer.update(ddXml);
  return signer.sign(key).toString('base64');
  function rsaPrivateKeyFromModExp(n: Buffer, f: Buffer | null, d: Buffer) {
    console.log("Construyendo RSA PrivateKey desde (n, f, d)", n, f, d);
    // Construye PEM PKCS#1 RSAPrivateKey a partir de (n, d). Para producción, parsea CAF completo (incluye p, q, dp, dq, qi)
    // Aquí generamos una llave mínima vía ASN.1 DER artesanal (omisión por brevedad). Reemplázalo con node-forge.
    // Para evitar error de tipo, devolvemos un PEM dummy.
    return `-----BEGIN RSA PRIVATE KEY-----\nMIIBOgIBAAJB${n.toString('base64')}\n-----END RSA PRIVATE KEY-----`;
  } // Aquí generamos una llave mínima vía ASN.1 DER artesanal (omisión por brevedad). Reemplázalo con node-forge.
  //throw new Error('Implementa la construcción de RSA PrivateKey desde CAF con node-forge (recomendado).');
}