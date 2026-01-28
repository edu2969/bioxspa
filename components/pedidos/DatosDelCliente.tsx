import { ICliente } from "@/types/cliente";
import { UseFormRegister, UseFormSetValue } from "react-hook-form";
import { INuevaVentaSubmit } from "./types";
import { useAuthorization } from '@/lib/auth/useAuthorization';
import { ROLES } from '@/lib/auth/permissions';
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Selector } from "../prefabs/Selector";
import { IDocumentoTributario } from "@/types/documentoTributario";
import ClientAddressManagerView from "../prefabs/ClientAddressManagerView";
import ClienteSearchView from "../prefabs/ClienteSearchView";
import type { IClienteSeachResult } from "../prefabs/types";
import Loader from "../Loader";

export default function DatosDelCliente({
    tipoOrden,
    register,
    setValue
}: {
    tipoOrden: number;
    register: UseFormRegister<INuevaVentaSubmit>;
    setValue: UseFormSetValue<INuevaVentaSubmit>;
}) {
    const auth = useAuthorization();
    const [clienteSelected, setClienteSelected] = useState<IClienteSeachResult | null>(null);    

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
            console.log("Cliente cargado:", data.cliente);
            return data.cliente;
        }
    });

    useEffect(() => {
        if (cliente && !loadingDocumentosTributarios && documentosTributarios && documentosTributarios.length > 0) {            
            setValue("documento_tributario_id", String(cliente.documento_tributario_id));
            setValue("cliente_id", cliente.id);
        }
    }, [cliente, documentosTributarios, loadingDocumentosTributarios, setValue]);

    return <fieldset className="border rounded-md px-4 pt-0 pb-2 space-y-4">
        <legend className="font-bold text-gray-700 px-2">Datos del Cliente</legend>
        
        {/* SELECCION DE CLIENTE */}
        {(tipoOrden == 1 || tipoOrden == 4) && <div className="w-full">
            <ClienteSearchView titulo="Seleccione al cliente" 
                register={register("cliente_id", { required: true })}
                setClienteSelected={setClienteSelected}
                isLoading={loadingCliente} />
        </div>}

        {/*EDICIÓN DE DIRECCIÓN DE DESPACHO */}
        {(cliente && (tipoOrden == 1 || tipoOrden == 4) &&
        <ClientAddressManagerView register={register("direccion_despacho_id")}
            label="Dirección de despacho"
            direcciones={cliente.direcciones_despacho?.map(d => d.direccion_id) || []}/>)}

        {/* DOCUMENTO TRIBUTARIO */}
        {auth.hasRole([ROLES.MANAGER, ROLES.COLLECTIONS, ROLES.SUPERVISOR])
            && cliente && tipoOrden == 1 && 
            <Selector options={documentosTributarios || []}
                label="Documento tributario"
                getLabel={dt => dt.nombre} getValue={dt => String(dt.id)} 
                register={register("documento_tributario_id", { required: true })} />}

            {loadingCliente && !cliente && <div className="h-40 flex items-center justify-center">
                <Loader texto="Cargando cliente..." />
            </div>}
    </fieldset>;
}












