import { supabase } from "@/lib/supabase";
import { connectMongoDB } from "@/lib/mongodb";
import Direccion from "@/models/direccion";
import Cliente from "@/models/cliente";
import Sucursal from "@/models/sucursal";
import Dependencia from "@/models/dependencia";
import { NextResponse } from "next/server";

export async function GET(req) {
    console.log("[GET /api/regenerator] Starting migration v.191. Disconnected...");
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (query === "repararSucursales") {
        const result = await repararSucursales();
        return NextResponse.json({ ok: true, result });
    }

    return NextResponse.json({ ok: false, error: "Invalid query parameter" }, { status: 400 });
}

const repararSucursales = async () => {
    await connectMongoDB();

    const summary = {
        sucursales: { processed: 0, updated: 0, missing_direccion: 0, missing_sup_direccion: 0, errors: [] },
        dependencias: { processed: 0, updated: 0, missing_direccion: 0, missing_sup_direccion: 0, errors: [] }
    };

    // Procesar sucursales Mongo -> Supabase
    try {
        const sucursales = await Sucursal.find().lean();
        for (const s of sucursales) {
            summary.sucursales.processed++;
            try {
                if (!s.direccionId) {
                    summary.sucursales.missing_direccion++;
                    continue;
                }

                const direccion = await Direccion.findById(s.direccionId).lean();
                if (!direccion || !direccion.apiId) {
                    summary.sucursales.missing_direccion++;
                    continue;
                }

                const { data: supDirs, error: supDirErr } = await supabase
                    .from("direcciones")
                    .select("id, api_id")
                    .eq("api_id", direccion.apiId)
                    .limit(1);

                if (supDirErr) {
                    summary.sucursales.errors.push({ sucursal: s.nombre, error: supDirErr.message });
                    continue;
                }

                if (!supDirs || supDirs.length === 0) {
                    summary.sucursales.missing_sup_direccion++;
                    continue;
                }

                const supDireccionId = supDirs[0].id;

                const { data: updated, error: updErr } = await supabase
                    .from("sucursales")
                    .update({ direccion_id: supDireccionId })
                    .eq("nombre", s.nombre)
                    .select("id, nombre");

                if (updErr) {
                    summary.sucursales.errors.push({ sucursal: s.nombre, error: updErr.message });
                    continue;
                }

                if (updated && updated.length > 0) {
                    summary.sucursales.updated += updated.length;
                }
            } catch (e) {
                summary.sucursales.errors.push({ sucursal: s.nombre, error: e.message });
            }
        }
    } catch (e) {
        summary.sucursales.errors.push({ fatal: true, error: e.message });
    }

    // Procesar dependencias Mongo -> Supabase
    try {
        const deps = await Dependencia.find().lean();
        for (const d of deps) {
            summary.dependencias.processed++;
            try {
                if (!d.direccionId) {
                    summary.dependencias.missing_direccion++;
                    continue;
                }

                const direccion = await Direccion.findById(d.direccionId).lean();
                if (!direccion || !direccion.apiId) {
                    summary.dependencias.missing_direccion++;
                    continue;
                }

                const { data: supDirs, error: supDirErr } = await supabase
                    .from("direcciones")
                    .select("id, api_id")
                    .eq("api_id", direccion.apiId)
                    .limit(1);

                if (supDirErr) {
                    summary.dependencias.errors.push({ dependencia: d.nombre, error: supDirErr.message });
                    continue;
                }

                if (!supDirs || supDirs.length === 0) {
                    summary.dependencias.missing_sup_direccion++;
                    continue;
                }

                const supDireccionId = supDirs[0].id;

                const { data: updated, error: updErr } = await supabase
                    .from("dependencias")
                    .update({ direccion_id: supDireccionId })
                    .eq("nombre", d.nombre)
                    .select("id, nombre");

                if (updErr) {
                    summary.dependencias.errors.push({ dependencia: d.nombre, error: updErr.message });
                    continue;
                }

                if (updated && updated.length > 0) {
                    summary.dependencias.updated += updated.length;
                }
            } catch (e) {
                summary.dependencias.errors.push({ dependencia: d.nombre, error: e.message });
            }
        }
    } catch (e) {
        summary.dependencias.errors.push({ fatal: true, error: e.message });
    }

    return summary;
}