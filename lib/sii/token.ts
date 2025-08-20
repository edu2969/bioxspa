import fetch from 'node-fetch';
import { SII_ENDPOINTS, SiiEnv } from './types';

export async function getSeed(env: SiiEnv) {
  const res = await fetch(`${SII_ENDPOINTS[env].getSeed}`);
  const xml = await res.text();
  const seed = /<SEMILLA>([^<]+)<\/SEMILLA>/.exec(xml)?.[1];
  if (!seed) throw new Error('No se obtuvo semilla');
  return seed;
}

export async function getToken(env: SiiEnv, seedSignedXml: string) {
  const body = `<?xml version="1.0" encoding="ISO-8859-1"?><getToken><item><Semilla>${seedSignedXml}</Semilla></item></getToken>`;
  const res = await fetch(`${SII_ENDPOINTS[env].getToken}`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml' },
    body,
  });
  const xml = await res.text();
  const token = /<TOKEN>([^<]+)<\/TOKEN>/.exec(xml)?.[1];
  if (!token) throw new Error('No se obtuvo token');
  return token;
}