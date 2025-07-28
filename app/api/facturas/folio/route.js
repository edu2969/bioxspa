// filepath: /app/api/facturas/folio/route.js
import { NextResponse } from "next/server";
/*import fs from "fs";
import path from "path";
import FormData from "form-data";*/
import { jsPDF } from "jspdf";

/*const getPDF = async () => {
    const certificadoPath = path.resolve(process.cwd(), "CertificadoTest.pfx");
    const cafPath = path.resolve(process.cwd(), "CAF_facturas_101_150.xml");
    const certificadoBuffer = fs.readFileSync(certificadoPath);
    const cafBuffer = fs.readFileSync(cafPath);

    // Construir el objeto de entrada
    const input = {
        Documento: {
            Encabezado: {
                IdentificacionDTE: {
                    TipoDTE: 33,
                    Folio: 101,
                    FechaEmision: "2023-04-11",
                    FechaVencimiento: "2023-05-11",
                    FormaPago: 1
                },
                Emisor: {
                    Rut: "76269769-6",
                    RazonSocial: "RAZÓN SOCIAL",
                    Giro: "GIRO GLOSA DESCRIPTIVA",
                    ActividadEconomica: [620200, 631100],
                    DireccionOrigen: "DIRECCION 787",
                    ComunaOrigen: "Santiago",
                    Telefono: []
                },
                Receptor: {
                    Rut: "66666666-6",
                    RazonSocial: "Razón Social de Cliente",
                    Direccion: "Dirección de Cliente",
                    Comuna: "Comuna de Cliente",
                    Giro: "Giro de Cliente",
                    Contacto: "Telefono Receptor"
                },
                RutSolicitante: "",
                Transporte: null,
                Totales: {
                    MontoNeto: 17328,
                    TasaIVA: 19,
                    IVA: 3292,
                    MontoTotal: 20620
                }
            },
            Detalles: [
                {
                    IndicadorExento: 0,
                    Nombre: "Producto_1",
                    Descripcion: "Descripcion de items",
                    Cantidad: 1.0,
                    UnidadMedida: "un",
                    Precio: 19327.731092,
                    Descuento: 0,
                    Recargo: 0,
                    MontoItem: 19328
                }
            ],
            Referencias: [],
            DescuentosRecargos: [
                {
                    TipoMovimiento: "Descuento",
                    Descripcion: "DESCUENTO GLOBAL APLICADO",
                    TipoValor: "Pesos",
                    Valor: 2000
                }
            ]
        },
        Certificado: {
            Rut: "17096073-4",
            Password: "******"
        }
    };

    // Crear FormData
    const form = new FormData();
    form.append("input", JSON.stringify(input));
    form.append("files", certificadoBuffer, { filename: "CertificadoTest.pfx", contentType: "application/x-pkcs12" });
    form.append("files", cafBuffer, { filename: "CAF_facturas_101_150.xml", contentType: "application/xml" });

    // Realizar la petición a simpleapi
    const response = await fetch("https://api.simpleapi.cl/api/v1/dte/generar", {
        method: "POST",
        headers: {
            ...form.getHeaders()
        },
        body: form
    });

    const data = await response.text();
}*/

async function getDummySiiPDF() {
    const doc = new jsPDF({ format: "letter", unit: "mm" });
    doc.setFontSize(16);
    doc.text("SERVICIOS DE IMPUESTOS INTERNOS", 20, 30);
    doc.setFontSize(12);
    doc.text("Factura Electrónica", 20, 40);
    doc.text("Folio: 123456789", 20, 50);
    doc.text("Fecha Emisión: 2024-06-01", 20, 60);
    doc.text("Emisor: Empresa de Ejemplo S.A.", 20, 70);
    doc.text("RUT: 12.345.678-9", 20, 80);
    doc.text("Receptor: Cliente de Ejemplo", 20, 90);
    doc.text("RUT: 98.765.432-1", 20, 100);
    doc.text("Monto Neto: $100.000", 20, 110);
    doc.text("IVA (19%): $19.000", 20, 120);
    doc.text("Monto Total: $119.000", 20, 130);
    doc.text("Este documento es un ejemplo generado por el sistema.", 20, 150);

    const pdfBuffer = doc.output("arraybuffer");
    return Buffer.from(pdfBuffer);
}

export async function POST() {
    try {
        // Leer archivos desde el sistema de archivos (ajusta las rutas según corresponda)
        const data = await getDummySiiPDF();
        return NextResponse.json({ ok: true, result: data });
    } catch (error) {
        console.error("ERROR", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}