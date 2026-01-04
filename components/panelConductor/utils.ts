import { IRutaConductorView } from "../prefabs/types";

export default function getVentaActual(rd: IRutaConductorView | undefined) {
    if (!rd) return null;
    const index = rd.ruta.findIndex(r => r.fechaArribo === null)
    const lastDireccionId = rd.ruta[index != -1 ? index : rd.ruta.length - 1].direccionDestinoId?._id || rd.ruta[rd.ruta.length - 1].direccionDestinoId;
    const venta = rd.ventaIds.find(v => v.direccionDespachoId === lastDireccionId);
    return venta;
}

