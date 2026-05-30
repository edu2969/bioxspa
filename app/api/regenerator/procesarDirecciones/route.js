import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

import fs from "fs";
import path from "path";

//
// ======================================================
// HELPERS
// ======================================================
//

function normalize(value) {
  return (value || "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseCsv(content) {
  const lines = content
    .split(/\r?\n/)
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  const headers = lines[0]
    .split(",")
    .map((x) => x.trim());

  return lines.slice(1).map((line) => {
    const values = line.split(",");

    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index]
        ? values[index].trim()
        : "";
    });

    return row;
  });
}

//
// ======================================================
// GET
// ======================================================
//

export async function GET() {
    console.log("Procesando direcciones");
  try {
    //
    // ======================================================
    // 1. LEER CSV
    // ======================================================
    //

    const filePath = path.join(
      process.cwd(),
      "public",
      "direcciones_transformadas.csv"
    );

    const csvContent = fs.readFileSync(
      filePath,
      "utf8"
    );

    const rows = parseCsv(csvContent);

    //
    // ======================================================
    // 2. OBTENER COMUNAS
    // ======================================================
    //

    const supabase = await getSupabaseServerClient();

    const {
      data: comunas,
      error: comunasError,
    } = await supabase
      .from("comunas")
      .select("id, nombre");

    if (comunasError) {
      console.error(comunasError);

      return NextResponse.json(
        {
          ok: false,
          error: "Error obteniendo comunas",
        },
        {
          status: 500,
        }
      );
    }

    //
    // ======================================================
    // 3. CREAR MAPA DE COMUNAS
    // ======================================================
    //

    const comunaMap = new Map();

    for (const comuna of comunas || []) {
      comunaMap.set(
        normalize(comuna.nombre),
        comuna.id
      );
    }

    //
    // ======================================================
    // ESTADÍSTICAS
    // ======================================================
    //

    let procesadas = 0;

    let noProcesadas = 0;

    let errores = 0;

    let sinComuna = 0;

    //
    // ======================================================
    // 4. RECORRER CSV
    // ======================================================
    //
console.log("Procesando filas CSV");
    for (const row of rows) {
      const nombre = row.nombre;
      const comunaNombre = row.comuna;

      //
      // Si no tiene comuna -> skip
      //

      if (!comunaNombre) {
        sinComuna++;
        continue;
      }

      //
      // Buscar comuna_id
      //

      const comunaId = comunaMap.get(
        normalize(comunaNombre)
      );

      if (!comunaId) {
        noProcesadas++;
        continue;
      }

      //
      // Buscar coincidencia exacta
      // en direccion_cliente
      //

      const {
        data: direcciones,
        error: direccionError,
      } = await supabase
        .from("direcciones")
        .select("id, direccion_cliente")
        .eq("direccion_cliente", nombre);

      if (direccionError) {
        console.error(direccionError);

        errores++;

        continue;
      }

      //
      // No encontrada
      //

      if (!direcciones || direcciones.length === 0) {
        noProcesadas++;
        continue;
      }

      //
      // Más de una coincidencia
      //

      if (direcciones.length > 1) {
        errores++;

        continue;
      }

      const direccion = direcciones[0];

      //
      // Actualizar comuna_id
      //

      const {
        error: updateError,
      } = await supabase
        .from("direcciones")
        .update({
          comuna_id: comunaId,
        })
        .eq("id", direccion.id);

      if (updateError) {
        console.error(updateError);

        errores++;

        continue;
      }

      procesadas++;
    }

    //
    // ======================================================
    // RESPONSE
    // ======================================================
    //

    return NextResponse.json({
      ok: true,

      totalFilas: rows.length,

      procesadas,

      noProcesadas,

      errores,

      sinComuna,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        ok: false,
        error: "Internal Server Error",
      },
      {
        status: 500,
      }
    );
  }
}