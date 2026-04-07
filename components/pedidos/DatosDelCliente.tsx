import { ICliente } from "@/types/cliente";
import { UseFormRegister, UseFormSetValue } from "react-hook-form";
import { INuevaVentaSubmit } from "./types";
import { useAuthorization } from '@/lib/auth/useAuthorization';
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Selector } from "../_prefabs/Selector";
import { IDocumentoTributario } from "@/types/documentoTributario";
import ClientAddressManagerView from "../_prefabs/ClientAddressManagerView";
import ClienteSearchView from "../_prefabs/ClienteSearchView";
import type { IClienteSeachResult } from "../_prefabs/types";
import Loader from "../Loader";
import { TIPO_CARGO } from "@/app/utils/constants";

export default function DatosDelCliente({
    tipoOrden,
    clienteInicial,
    direccionDespachoInicialId,
    register,
    setValue
}: {
    tipoOrden: number;
    clienteInicial?: IClienteSeachResult | null;
    direccionDespachoInicialId?: string | null | undefined;
    register: UseFormRegister<INuevaVentaSubmit>;
    setValue: UseFormSetValue<INuevaVentaSubmit>;
}) {
    const auth = useAuthorization();
    const [clienteSelected, setClienteSelected] = useState<IClienteSeachResult | null>(clienteInicial || null);
    const [textoInicial, setTextoInicial] = useState(clienteInicial?.nombre || "");

    const { data: documentosTributarios, isLoading: loadingDocumentosTributarios } = useQuery<IDocumentoTributario[]>({
        queryKey: ['documentos-tributarios-venta'],
        queryFn: async () => {
            const response = await fetch('/api/ventas/documentosTributarios?venta=true');
            const data = await response.json();
            return data.documentosTributarios;
        }
    }); 
    
    const { data: cliente, isLoading: loadingCliente } = useQuery<ICliente>({
        queryKey: ['cliente-by-id', clienteSelected],
        queryFn: async () => {
            if (!clienteSelected?.id) return null;
            const response = await fetch(`/api/clientes?id=${clienteSelected.id}`);
            const data = await response.json();
            return data.cliente;
        },
        enabled: !!clienteSelected?.id        
    });

    useEffect(() => {
        if (cliente && !loadingDocumentosTributarios 
            && documentosTributarios 
            && documentosTributarios.length > 0) {
            console.log("Cliente seleccionado:", cliente);
            setValue("clienteId", cliente.id);            
            if(clienteInicial?.nombre === '') {            
                setClienteSelected({
                    id: cliente.id || '',
                    nombre: cliente.nombre,
                    rut: cliente.rut,
                    direccionesDespacho: cliente.direccionesDespacho || []
                });
                setValue("documentoTributarioId", String(cliente.documentoTributarioId));
                setValue("direccionDespachoId", direccionDespachoInicialId || '');
            }
        }
    }, [cliente, documentosTributarios, loadingDocumentosTributarios, setValue, direccionDespachoInicialId]);

    return <fieldset className="border rounded-md px-4 pt-0 pb-2 space-y-4">
        <legend className="font-bold text-gray-700 px-2">Datos del Cliente</legend>
        
        {/* SELECCION DE CLIENTE */}
        {(tipoOrden == 1 || tipoOrden == 4) && <div className="w-full">
            <ClienteSearchView titulo="Seleccione al cliente" 
                register={register("clienteId", { required: true })}
                setClienteSelected={setClienteSelected}
                clienteInicial={{
                    id: clienteSelected?.id || '',
                    nombre: clienteSelected?.nombre || ''
                }}
                isLoading={loadingCliente} />
        </div>}

        {/*EDICIÓN DE DIRECCIÓN DE DESPACHO */}
        {(cliente && (tipoOrden == 1 || tipoOrden == 4) &&
        <ClientAddressManagerView register={register("direccionDespachoId")}
            label="Dirección de despacho"
            direccionIdInicialId={direccionDespachoInicialId}
            direcciones={cliente.direccionesDespacho || []}/>)}

        {/* DOCUMENTO TRIBUTARIO */}
        {auth.hasRole([TIPO_CARGO.encargado, TIPO_CARGO.responsable, TIPO_CARGO.cobranza])
            && cliente && tipoOrden == 1 && 
            <Selector options={documentosTributarios || []}
                label="Documento tributario"
                getLabel={dt => dt.nombre} getValue={dt => String(dt.id)} 
                register={register("documentoTributarioId", { required: true })} />}

            {loadingCliente && !cliente && <div className="h-40 flex items-center justify-center">
                <Loader texto="Cargando cliente..." />
            </div>}
    </fieldset>;
}












