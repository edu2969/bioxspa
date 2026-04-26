import { ICliente } from "@/types/cliente";
import { UseFormRegister, UseFormSetValue } from "react-hook-form";
import { INuevaVentaSubmit } from "./types";
import { useAuthorization } from '@/lib/auth/useAuthorization';
import { useQuery } from "@tanstack/react-query";
import { Selector } from "../_prefabs/Selector";
import { IDocumentoTributario } from "@/types/documentoTributario";
import ClientAddressManagerView from "../_prefabs/ClientAddressManagerView";
import ClienteSearchView from "../_prefabs/ClienteSearchView";
import Loader from "../Loader";
import { TIPO_CARGO } from "@/app/utils/constants";

export default function DatosDelCliente({
    tipoOrden,
    clienteId,
    direccionId,
    register
}: {
    tipoOrden: number;
    clienteId?: string;
    direccionId?: string;
    direccionDespachoInicialId?: string | null | undefined;
    register: UseFormRegister<INuevaVentaSubmit>;
}) {
    const auth = useAuthorization();

    const { data: documentosTributarios, isLoading: loadingDocumentosTributarios } = useQuery<IDocumentoTributario[]>({
        queryKey: ['documentos-tributarios-venta'],
        queryFn: async () => {
            const response = await fetch('/api/ventas/documentosTributarios?venta=true');
            const data = await response.json();
            return data.documentosTributarios;
        }
    }); 
    
    const { data: cliente, isLoading: loadingCliente } = useQuery<ICliente>({
        queryKey: ['cliente-by-id', clienteId],
        queryFn: async () => {
            const response = await fetch(`/api/clientes?id=${clienteId}`);
            const data = await response.json();
            console.log("Data-Cliente ---->", data);
            return data.cliente;
        },
        enabled: !!clienteId
    });

    return <fieldset className="border rounded-md px-4 pt-0 pb-2 space-y-4">
        <legend className="font-bold text-gray-700 px-2">Datos del Cliente</legend>
        
        {/* SELECCION DE CLIENTE */}
        {(tipoOrden == 1 || tipoOrden == 4) && <div className="w-full">
            <ClienteSearchView titulo="Seleccione al cliente" 
                register={register("clienteId", { required: true })}
                clienteId={clienteId}
                isLoading={loadingCliente} />
        </div>}

        {/*EDICIÓN DE DIRECCIÓN DE DESPACHO */}
        {(cliente && (tipoOrden == 1 || tipoOrden == 4) &&
        <ClientAddressManagerView register={register("direccionDespachoId")}
            label="Dirección de despacho"
            direccionIdInicialId={direccionId}
            direcciones={cliente.direccionesDespacho || []}/>)}

        {/* DOCUMENTO TRIBUTARIO */}
        {auth.hasRole([TIPO_CARGO.encargado, TIPO_CARGO.responsable, TIPO_CARGO.cobranza])
            && cliente && tipoOrden == 1 && !loadingDocumentosTributarios && documentosTributarios?.length &&
            <Selector options={documentosTributarios || []}
                label="Documento tributario"
                getLabel={dt => dt.nombre} getValue={dt => String(dt.id)}
                defaultValue={cliente.documentoTributarioId || ''}
                isLoading={loadingDocumentosTributarios}
                register={register("documentoTributarioId", { required: true })} />}

            {loadingCliente && !cliente && <div className="h-40 flex items-center justify-center">
                <Loader texto="Cargando cliente..." />
            </div>}
    </fieldset>;
}












