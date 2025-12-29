import { ICliente } from "@/types/cliente";
import { UseFormRegister, UseFormSetValue } from "react-hook-form";
import { INuevaVentaSubmit } from "./types";
import { useSession } from "next-auth/react";
import { USER_ROLE } from "@/app/utils/constants";
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
    const { data: session } = useSession();
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
            if (!clienteSelected?._id) return null;
            const response = await fetch(`/api/clientes?id=${clienteSelected._id}`);
            const data = await response.json();
            return data.cliente;
        }
    });

    useEffect(() => {
        if (cliente && !loadingDocumentosTributarios && documentosTributarios && documentosTributarios.length > 0) {            
            setValue("documentoTributarioId", String(cliente.documentoTributarioId));
            setValue("clienteId", cliente._id);
        }
    }, [cliente, documentosTributarios, loadingDocumentosTributarios, setValue]);

    return <fieldset className="border rounded-md px-4 pt-0 pb-2 space-y-4">
        <legend className="font-bold text-gray-700 px-2">Datos del Cliente</legend>
        
        {/* SELECCION DE CLIENTE */}
        {(tipoOrden == 1 || tipoOrden == 4) && <div className="w-full">
            <ClienteSearchView titulo="Seleccione al cliente" 
                register={register("clienteId", { required: true })}
                setClienteSelected={setClienteSelected}
                isLoading={loadingCliente} />
        </div>}

        {/*EDICIÓN DE DIRECCIÓN DE DESPACHO */}
        {(cliente && (tipoOrden == 1 || tipoOrden == 4) &&
        <ClientAddressManagerView register={register("direccionDespachoId")}
            label="Dirección de despacho"
            direcciones={cliente.direccionesDespacho?.map(d => d.direccionId) || []}/>)}

        {/* DOCUMENTO TRIBUTARIO */}
        {(session?.user.role === USER_ROLE.gerente || session?.user.role === USER_ROLE.cobranza 
            || session?.user.role === USER_ROLE.encargado)
            && cliente && tipoOrden == 1 && 
            <Selector options={documentosTributarios || []}
                label="Documento tributario"
                getLabel={dt => dt.nombre} getValue={dt => String(dt._id)} 
                register={register("documentoTributarioId", { required: true })} />}

            {loadingCliente && !cliente && <div className="h-40 flex items-center justify-center">
                <Loader texto="Cargando cliente..." />
            </div>}
    </fieldset>;
}












