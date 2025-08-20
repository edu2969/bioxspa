import { NextRequest } from 'next/server';
export const runtime = 'nodejs';

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const body = await req.json();
    // 1) Cargar datos de emisor/sender y CAF
    // 2) Construir DTE 33 + TED
    // 3) Envolver en EnvioDTE y firmar
    // 4) Obtener semilla -> firmarla -> token
    // 5) Subir por DTEUpload -> TRACKID
    // 6) Retornar TRACKID
    console.log("BODY", body);
    return new Response(JSON.stringify({ ok: true, trackId: '123456' }), { status: 200 });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, error: errorMessage }), { status: 500 });
  }
}