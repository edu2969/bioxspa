import fetch from 'node-fetch';
import FormData from 'form-data';
import { SII_ENDPOINTS, SiiEnv } from './types';

export async function dteUpload(env: SiiEnv, token: string, rutSender: string, rutCompany: string, envioXml: string, filename = 'envio.xml') {
  const [rs, ds] = rutSender.split('-');
  const [rc, dc] = rutCompany.split('-');
  const form = new FormData();
  form.append('rutSender', rs);
  form.append('dvSender', ds);
  form.append('rutCompany', rc);
  form.append('dvCompany', dc);
  form.append('archivo', Buffer.from(envioXml, 'latin1'), { filename, contentType: 'text/xml' });

  const res = await fetch(SII_ENDPOINTS[env].dteUpload, {
    method: 'POST',
    headers: {
      Cookie: `TOKEN=${token}`,
      ...form.getHeaders(),
    },
    body: form.getBuffer(),
  });
  const text = await res.text();
  // Respuesta HTML con TRACKID o XML; extrae TRACKID
  const track = /TRACKID=(\d+)/.exec(text)?.[1] || /<TRACKID>(\d+)<\/TRACKID>/.exec(text)?.[1];
  if (!track) throw new Error('No se obtuvo TRACKID');
  return track;
}