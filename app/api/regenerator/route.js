import { connectMongoDB } from "@/lib/mongodb";
import Xliente from "@/models/xliente";
import Cliente from "@/models/cliente";
import Direccion from "@/models/direccion";
import User from "@/models/user"; // Asegúrate de tener el modelo de User importado
import XocumentoTributario from "@/models/xocumentoTributario";
import { NextResponse } from "next/server";

export async function GET() {
    return NextResponse.json({ message: "Data transferred successfully" });
    
    try {
        console.log("Connecting to MongoDB...");
        await connectMongoDB();
        console.log("Connected to MongoDB.");

        const xlientes = await Xliente.find({});
        console.log(`Found ${xlientes.length} xlientes.`);

        const apiKey = process.env.GOOGLE_API_KEY;
        const totalXlientes = xlientes.length;
        const startTime = Date.now();
        let clientesBatch = [];

        for (let i = 0; i < totalXlientes; i++) {
            const x = xlientes[i];
            
            const documentoTributario = await XocumentoTributario.findOne({ id: x.tipodoc });

            // Fetch address details from Google Maps API
            const query = encodeURIComponent(x.direccion);
            console.log(`Fetching address details for query: ${x.direccion}`);
            const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}`;

            await new Promise(resolve => setTimeout(resolve, 200)); // Wait for 200 milliseconds

            const response = await fetch(url);
            const data = await response.json();

            let direccionId = null;

            if (data.results && data.results.length > 0) {
                console.log(`Google Maps API response for query ${query}:`, JSON.stringify(data, null, 2));
                const place = data.results[0];
                let direccion = await Direccion.findOne({ apiId: place.place_id });
                const formattedAddressParts = place.formatted_address.split(',').map(part => part.trim());
                const comuna = formattedAddressParts.length > 1 ? formattedAddressParts[1] : '';
                const ciudad = formattedAddressParts.length > 2 ? formattedAddressParts[2] : '';
                const region = formattedAddressParts.length > 3 ? formattedAddressParts[3] : '';

                if (!direccion) {                    
                    direccion = new Direccion({
                        nombre: place.formatted_address,
                        apiId: place.place_id,
                        direccionOriginal: x.direccion,
                        latitud: place.geometry.location.lat,
                        longitud: place.geometry.location.lng,
                        comuna: comuna,
                        ciudad: ciudad,
                        region: region,
                        isoPais: 'CL',
                        categoria: place.types[0] || ''
                    });
                    await direccion.save();
                    console.log(`Saved new direccion for xliente ${x.nombre}: ${direccion._id}`);
                } else {
                    if (direccion.nombre !== place.formatted_address || !direccion.comuna) {
                        direccion.nombre = place.formatted_address;
                        direccion.direccionOriginal = x.direccion;
                        direccion.comuna = comuna;
                        direccion.ciudad = ciudad;
                        direccion.region = region;
                        direccion.isoPais = 'CL';
                        direccion.categoria = place.types[0] || '';                        
                        await direccion.save();
                        console.log(`Updated direccion glosa for xliente ${x.nombre}: ${direccion._id}`);
                    } else {
                        console.log(`Found existing direccion for xliente ${x.nombre}: ${direccion._id}`);
                    }
                }

                direccionId = direccion._id;
            } else {
                console.log(`No address found for query: ${query}`);
            }

            // Find the creator's user ID based on the creado_por field
            let creadorId = null;
            if (x.creado_por) {
                const user = await User.findOne({ email: x.creado_por });
                if (user) {
                    creadorId = user._id;
                }
            }

            clientesBatch.push({
                creadorId: creadorId,
                nombre: x.nombre,
                rut: x.rut,
                direccionId: direccionId,
                giro: x.giro || "",
                telefono: x.telefono || "",
                email: x.email || "",
                emailIntercambio: x.email_intercambio || null,
                envioFactura: x.envio_factura?.toLowerCase() === "si",
                envioReporte: x.envio_reporte?.toLowerCase() === "si",
                seguimiento: x.seguimiento?.toLowerCase() === "si",
                ordenCompra: x.orden_compra?.toLowerCase() === "si",
                reporteDeuda: x.reporte_deuda?.toLowerCase() === "si",
                arriendo: x.arriendo?.toLowerCase() === "si",
                dias_de_pago: parseInt(x.dias_de_pago) || 1,
                notificacion: x.notificacion?.toLowerCase() === "si",
                credito: x.credito?.toLowerCase() === "si",
                urlWeb: x.web || "",
                comentario: x.comentario || "",
                contacto: x.contacto || "",
                tipoPrecio: x.tipoprecio?.toLowerCase() === "mayorista" ? 1 : 2,
                documentoTributarioId: documentoTributario ? documentoTributario._id : null,
                activo: x.activo === true,
                cilindrosMin: 0,
                cilindrosMax: parseInt(x.limite_cilindros) || 9999,
                enQuiebra: x.quiebra?.toLowerCase() === "si",
                mesesAumento: x.mesesaumento ? x.mesesaumento.split(',').map(Number) : null,
                createdAt: x.created_at,
                updatedAt: x.updated_at,
            });

            if (clientesBatch.length === 25 || i === totalXlientes - 1) {
                console.log(`Inserting batch of ${clientesBatch.length} clientes into the database...`);
                await Cliente.insertMany(clientesBatch);
                console.log(`Inserted batch of ${clientesBatch.length} clientes into the database.`);
                clientesBatch = [];
            }

            const processedPercentage = ((i + 1) / totalXlientes) * 100;
            const elapsedTime = (Date.now() - startTime) / 1000; // in seconds
            const estimatedTotalTime = (elapsedTime / (i + 1)) * totalXlientes;
            const estimatedRemainingTime = estimatedTotalTime - elapsedTime;

            console.log(`Processed ${processedPercentage.toFixed(2)}% of xlientes. Estimated time remaining: ${estimatedRemainingTime.toFixed(2)} seconds.`);
        }

        return NextResponse.json({ message: "Data transferred successfully" });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}