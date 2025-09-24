// /app/api/dte/test/route.ts
import { NextRequest } from 'next/server';
import { CASOS_TEST } from '../casos-test';

export async function GET(req: NextRequest): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const caso = searchParams.get('caso');
  
  if (!caso || !CASOS_TEST[caso]) {
    return new Response(JSON.stringify({ 
      ok: false, 
      error: 'Caso de test no encontrado',
      casosDisponibles: Object.keys(CASOS_TEST)
    }), { status: 400 });
  }

  // Procesar el caso de test
  const response = await fetch('/api/dte/sii/issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(CASOS_TEST[caso])
  });

  return response;
}