"use client";

import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { VscCommentDraft, VscCommentUnresolved } from "react-icons/vsc";
import { getNUCode } from "@/lib/nuConverter";
import type { ICargaDespachoView } from "@/types/types";
import { LiaPencilAltSolid } from "react-icons/lia";
import { useForm } from "react-hook-form";
import Image from "next/image";
import { TIPO_ESTADO_RUTA_DESPACHO, TIPO_ORDEN } from "@/app/utils/constants";
import { BsQrCodeScan } from "react-icons/bs";
import { FaRoadCircleCheck } from "react-icons/fa6";
import Loader from "../Loader";
import QuienRecibeModal from "../modals/QuienRecibeModal";
import ModalConfirmarCargaParcial from "../modals/ModalConfirmarCargaParcial";
import { useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * Reordena los cargamentos después de remover el primer elemento
 * Preserva el orden personalizado establecido por el botón SIGUIENTE
 */
function preserveOrderAfterRemoval(oldData: ICargaDespachoView[] | undefined) {
  if (!oldData || oldData.length === 0) return oldData;
  // Remover el primer elemento del array manteniendo el resto en orden
  return oldData.slice(1);
}

interface FormData {
  nombreRetira: string;
  rutRetiraNum: string;
  rutRetiraDv: string;
}

export default function GestorDeCargaView({
  cargamentos = [],
  index,
  setScanMode,
}: {
  cargamentos: ICargaDespachoView[] | undefined;
  index: number;
  setScanMode: (scanMode: boolean) => void;
}) {
  const [animating, setAnimating] = useState(false);
  const [showModalNombreRetira, setShowModalNombreRetira] = useState(false);
  const [selectedVentaId, setSelectedVentaId] = useState<string | null>(null);
  const [inputTemporalVisible, setInputTemporalVisible] = useState(false);
  const [modalConfirmarCargaParcial, setModalConfirmarCargaParcial] = useState(false);
  const temporalRef = useRef<HTMLInputElement>(null);
  const { setValue } = useForm<FormData>();
  const queryClient = useQueryClient();

  const handleRemoveFirst = () => {
    setAnimating(true);
    setTimeout(() => {
      setAnimating(false);
      setScanMode(false);
    }, 1000);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const cargamento = cargamentos?.[0];
      if (!cargamento) throw new Error('No hay cargamento disponible');

      // Endpoint dinámico basado en si tiene ruta_id
      const endpoint = cargamento.ruta_id ?
        `/api/pedidos/despacho` :
        `/api/pedidos/despacho/confirmarEntregaEnLocal`;

      // Payload dinámico basado en el tipo de entrega
      const payload = cargamento.ruta_id ? {
        ruta_id: cargamento.ruta_id
      } : {
        venta_id: cargamento.ventas[0]?.venta_id,
        nombre_recibe: cargamento.ventas[0]?.entregas_en_local?.[0]?.nombre_recibe || '',
        rut_recibe: cargamento.ventas[0]?.entregas_en_local?.[0]?.rut_recibe || ''
      };

      console.log("Confirmando cargamento con payload:", payload);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Error al guardar el cargamento: ${errorData.error || response.status}`);
      }

      return await response.json();
    },
    onSuccess: (data: { ok: boolean }) => {
      if (data.ok) {
        toast.success('Cargamento confirmado con éxito');

        // Ejecutar la animación de remoción
        handleRemoveFirst();

        // Preservar el orden actual antes de cualquier actualización
        const cargamentosActuales = queryClient.getQueryData(['cargamentos-despacho']);

        // Después de 1 segundo (tiempo de animación), actualizar la query data preservando orden
        setTimeout(() => {
          if (cargamentosActuales && Array.isArray(cargamentosActuales)) {
            // Usar la función que preserva el orden al remover el primer elemento
            const cargamentosActualizados = preserveOrderAfterRemoval(cargamentosActuales);
            queryClient.setQueryData(['cargamentos-despacho'], cargamentosActualizados);
            
            // También invalidar para obtener datos frescos, pero después de establecer el orden
            setTimeout(() => {
              const datosActuales = queryClient.getQueryData(['cargamentos-despacho']);
              queryClient.invalidateQueries({ queryKey: ['cargamentos-despacho'] });
              
              // Si después de invalidar hay cambios, reordenar preservando la estructura
              setTimeout(() => {
                const datosNuevos = queryClient.getQueryData(['cargamentos-despacho']);
                if (datosNuevos && Array.isArray(datosNuevos) && datosActuales && Array.isArray(datosActuales)) {
                  // Solo reordenar si hay diferencias en la estructura, no en el orden
                  if (datosNuevos.length !== datosActuales.length) {
                    queryClient.setQueryData(['cargamentos-despacho'], datosNuevos);
                  }
                }
              }, 100);
            }, 50);
          } else {
            // Fallback al comportamiento original si no hay datos actuales
            queryClient.setQueryData(['cargamentos-despacho'], (oldData: ICargaDespachoView[] | undefined) => {
              return preserveOrderAfterRemoval(oldData);
            });
          }
        }, 1000);
      } else {
        toast.error('Error: La respuesta no fue exitosa');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error desconocido al confirmar el pedido');
    }
  });

  const loadState = () => {
    if (!cargamentos || cargamentos.length === 0) return { complete: false, partial: false };
    // Usar el cargamento específico de este componente visual (index), no necesariamente el primero
    const cargamento = cargamentos[0]; // Este componente siempre recibe un array con un solo elemento    
    const esProcesoCarga = cargamento.ruta_id !== null && cargamento.estado === TIPO_ESTADO_RUTA_DESPACHO.preparacion;
    const esProcesoDescarga = cargamento.ruta_id !== null && cargamento.estado === TIPO_ESTADO_RUTA_DESPACHO.descarga;
    const tieneTraslado = cargamento.ventas.some(v => v.tipo === TIPO_ORDEN.traslado);
    const ventaEnLocal = cargamento.ruta_id === null;


    if (tieneTraslado) {
      const itemsRetirados = Array.isArray(cargamento.carga_item_ids) && cargamento.carga_item_ids.length === 0;

      if (itemsRetirados) {
        return { complete: true, porcentaje: 100 };
      }
      return {
        partial: false, porcentaje: 0
      };
    }

    if (esProcesoCarga) {
      // Crear un Set de los subcategoria_catalogo_id que están en carga_item_ids
      const cargaItemSubcategoriaIds = new Set(
        cargamento.carga_item_ids.map(item => item.subcategoria_catalogo_id)
      );

      const porcentaje = cargamento.ventas.reduce((accVenta, venta) => {
        const porcentajeVenta = venta.detalles.reduce((accDetalle, detalle) => {
          const totalItems = detalle.multiplicador;
          const itemsEscaneados = totalItems - (detalle.restantes || 0);
          return accDetalle + (itemsEscaneados / totalItems) * 100;
        }
          , 0) / venta.detalles.length;
        return accVenta + porcentajeVenta;
      }, 0) / cargamento.ventas.length;

      // Verificar si cada venta tiene al menos un detalle con subcategoriaCatalogoId en cargaItemIds
      const todasLasVentasTienenAlMenosUno = porcentaje < 100 && cargamento.ventas.every(venta =>
        venta.detalles.some(detalle =>
          cargaItemSubcategoriaIds.has(String(detalle.subcategoria_catalogo_id.id))
        )
      );

      return {
        partial: porcentaje < 100 && todasLasVentasTienenAlMenosUno,
        complete: porcentaje >= 100,
        porcentaje: Math.round(porcentaje)
      };
    }

    if (esProcesoDescarga) {
      return {
        partial: true,
        porcentaje: Math.round(0)
      };
    }

    if (ventaEnLocal) {
      console.log("VENTA EN LOCAL");
      // Calcular porcentaje basado en los restantes
      const porcentaje = cargamento.ventas.reduce((accVenta, venta) => {
        const porcentajeVenta = venta.detalles.reduce((accDetalle, detalle) => {
          const totalItems = detalle.multiplicador;
          const itemsEntregados = totalItems - (detalle.restantes || 0);
          return accDetalle + (itemsEntregados / totalItems) * 100;
        }, 0) / venta.detalles.length;
        return accVenta + porcentajeVenta;
      }, 0) / cargamento.ventas.length;

      // Verificar si todas las entregas están completas (todos los restantes son 0)
      const todasLasEntregasCompletas = cargamento.ventas.every(venta =>
        venta.detalles.every(detalle => detalle.restantes === 0)
      );

      // Verificar si hay al menos una entrega parcial (al menos un restante < multiplicador)
      const hayEntregasParciales = cargamento.ventas.some(venta =>
        venta.detalles.some(detalle => detalle.restantes < detalle.multiplicador)
      );

      const validacionQuienRecibe = cargamento.ventas[0]?.entregas_en_local?.[0];
      if (!validacionQuienRecibe || !validacionQuienRecibe.nombre_recibe || !validacionQuienRecibe.rut_recibe) {
        console.log("Falta información de quién recibe en local");        
      }

      return {
        complete: porcentaje >= 100,
        partial: !todasLasEntregasCompletas && hayEntregasParciales,
        faltaQuienRecibe: !validacionQuienRecibe || !validacionQuienRecibe.nombre_recibe || !validacionQuienRecibe.rut_recibe,
        porcentaje: Math.round(porcentaje)
      };
    }

    console.log("Estado de carga no reconocido", cargamentos[0]);
    throw new Error("Estado de carga no reconocido");
  }

  return (<div className="flex flex-col w-full">
    {cargamentos && cargamentos.map((cargamento, cidx) =>
      <div key={`cargamento_${cidx}`} className="w-full">
        <div className={`absolute -ml-2 md:w-1/2 h-[calc(100vh-124px)] ${animating ? "transition-all duration-500" : ""}`}
          style={{
            top: `${cidx * 10 + 12}px`,
            left: `${cidx * 10 + 16}px`,
            zIndex: cargamentos.length - cidx,
            scale: 1 - cidx * 0.009,
            transform: `translateX(${animating && cidx == 0 ? "-100%" : "0"})`,
            opacity: animating && cidx == 0 ? 0 : 1,
            width: '95%'
          }}>

          {!cargamento.retiro_en_local && <div className="w-full flex text-xl font-bold px-3 pt-0 pb-1">
            <div>
              <p className="text-xs">CHOFER</p>
              <p className="font-bold -mt-2 text-nowrap">{cargamento.nombre_chofer?.split(" ").splice(0, 2).join(" ")}</p>
            </div>
            <div className="w-full text-gray-500 mr-0 items-end flex justify-end">
              <div className="w-[76px] text-center bg-white rounded-md p-0.5">
                <div className="flex justify-start md:justify-start bg-white rounded-sm border-gray-400 border px-0.5 pb-0.5 space-x-0.5">
                  <p className="font-bold text-sm">{cargamento.patente_vehiculo?.substring(0, 2)}</p>
                  <Image width={82} height={78} src="/ui/escudo.png" alt="separador" className="w-[9px] h-[9px]" style={{ "marginTop": "7px" }} />
                  <p className="font-bold text-sm">{cargamento.patente_vehiculo?.substring(2, cargamento.patente_vehiculo.length)}</p>
                </div>
              </div>
            </div>
          </div>}

          {cargamento.ventas && cargamento.ventas.map((venta, vidx) => <div key={`venta_${vidx}`} className="w-full mb-2 bg-gray-200 p-1 rounded-md shadow-md">
            {cargamento.retiro_en_local && <div className="w-full flex text-xl font-bold px-3 py-1">
              <div className="w-full flex text-lg font-bold px-3 relative">
                <div className="w-full relative">
                  <p className="text-xs">Nombre de quién retira en local</p>
                  <div className="mt-1 text-nowrap border border-gray-300 rounded px-2">
                    <p className="-mt-1">{venta.entregas_en_local[0]?.nombre_recibe || 'Desconocido'}</p>
                    <p className="text-xs -mt-1">RUT: {venta.entregas_en_local[0]?.rut_recibe || '-'}</p>
                  </div>
                </div>
                <div className="absolute top-8 right-5 text-blue-500 flex items-center justify-end">
                  <LiaPencilAltSolid className="cursor-pointer hover:text-blue-600" size="1.3rem" onClick={() => {
                    setValue("nombreRetira", venta.entregas_en_local[0]?.nombre_recibe || "");
                    setValue("rutRetiraNum", venta.entregas_en_local[0]?.rut_recibe ? venta.entregas_en_local[0].rut_recibe.split("-")[0] : "");
                    setValue("rutRetiraDv", venta.entregas_en_local[0]?.rut_recibe ? venta.entregas_en_local[0].rut_recibe.split("-")[1] : "");
                    setSelectedVentaId(venta.venta_id);
                    setShowModalNombreRetira(true);
                  }} />
                </div>
              </div>
            </div>}
            <div className="w-full flex px-2 border border-gray-300 rounded-t-lg border-b-0 bg-white pb-1">
              <div className="w-full text-left ml-2 text-gray-400">
                <p className="text-md font-bold truncate -mb-1">{venta.cliente.nombre || "Sin cliente"}</p>
                <p className="text-xs truncate m-0">{venta.cliente.rut}</p>
                {cargamento.retiro_en_local && <div className="text-sm font-bold text-gray-700">
                  <p>ENTREGA DE CILINDROS</p>
                  {index === 0 && <span className="text-xs">Escanee cilindros a entregar</span>}
                </div>}
              </div>
              <div className={`relative flex justify-end ${venta.comentario ? 'text-gray-500' : 'text-gray-400 '}`}>
                <div className="mt-1 mr-2 cursor-pointer" onClick={(e) => {
                  e.stopPropagation();
                  if (index === 0) {
                    toast(`${venta.comentario || "Sin comentarios"}`, { icon: '💬' });
                  }
                }}>
                  {!venta.comentario
                    ? <VscCommentDraft size="1.75rem" />
                    : <VscCommentUnresolved size="1.75rem" />}
                </div>
                {venta.comentario && <div className="absolute top-[20px] right-[10px] w-[10px] h-[10px] rounded-full bg-red-600"></div>}
              </div>
            </div>
            <ul className="flex-1 flex flex-wrap items-center justify-center -mt-0.5">
              {venta.detalles.map((detalle, idx) => (
                <li
                  key={`descarga_${idx}`}
                  className={`w-full flex text-sm border border-gray-300 px-0 py-2 ${(idx === 0 && venta.detalles.length != 1) ? 'rounded-t-lg' : (idx === venta.detalles.length - 1 && venta.detalles.length != 1)
                    ? 'rounded-b-lg' : venta.detalles.length === 1 ? 'rounded-lg' : ''} ${detalle.restantes === 0 ? 'bg-green-300 opacity-50 cursor-not-allowed' : detalle.restantes < 0 ? 'bg-yellow-100' : 'bg-white hover:bg-gray-100 cursor-pointer'} transition duration-300 ease-in-out`}
                >
                  <div className="w-full flex items-left">
                    <div className="flex">
                      <div>
                      <div className="text-white bg-orange-400 px-2 py-0 rounded text-xs ml-0.5 -my-1 h-4 mb-1.5 font-bold">{getNUCode(detalle.subcategoria_catalogo_id.categoria_catalogo_id.elemento)}</div>
                      {detalle.subcategoria_catalogo_id.categoria_catalogo_id.es_industrial && <div className="text-white bg-blue-400 px-2 py-0 rounded text-xs -ml-2 -my-1 h-4 mb-1.5">Industrial</div>}
                      {detalle.subcategoria_catalogo_id.sin_sifon && <div className="text-white bg-gray-400 px-2 py-0 rounded text-xs -ml-2 -my-1 h-4">Sin Sifón</div>}
                      </div>
                      <div className="font-bold text-xl ml-2">
                        {detalle.subcategoria_catalogo_id.categoria_catalogo_id.elemento && <span>
                          {(() => {
                            const elem = detalle.subcategoria_catalogo_id.categoria_catalogo_id.elemento;
                            let match = elem.match(/^([a-zA-Z]*)(\d*)$/);
                            if (!match) {
                              match = ["", (elem ?? 'N/A'), ''];
                            }
                            const [, p1, p2] = match;
                            return (
                              <>
                                {p1 ? p1.toUpperCase() : ''}
                                {p2 ? <small>{p2}</small> : ''}
                              </>
                            );
                          })()}
                        </span>}
                      </div>
                    </div>
                        <p className="text-2xl orbitron ml-2"><b>{detalle.subcategoria_catalogo_id.cantidad}</b> <small>{detalle.subcategoria_catalogo_id.unidad}</small></p>
                  </div>
                  <div className="w-24 text-xl font-bold orbitron border-l-gray-300 text-right mr-3 border-l-2">{detalle.multiplicador - detalle.restantes} <small>/</small> {detalle.multiplicador}</div>
                </li>
              ))}
            </ul>
          </div>)}

          {index === 0 && !inputTemporalVisible && <div className="absolute -bottom-2 flex flex-col w-full pr-4">
            <div className="flex">
              <button className={`text-white mx-2 h-12 w-12 flex text-sm border border-gray-300 rounded-lg p-1 mb-1 bg-blue-500`}
                onClick={(e) => {
                  e.stopPropagation();
                  setScanMode(true);
                }}>
                <BsQrCodeScan className="text-4xl" />
              </button>
              <button className={`relative w-full h-12 flex justify-center text-white border border-gray-300 rounded-lg py-1 px-4 ${loadState().complete ? 'bg-green-500 cursor-pointer' : loadState().partial ? 'bg-yellow-500 cursor-pointer' : 'bg-gray-400 opacity-50 cursor-not-allowed'}`}
                onClick={() => {
                  if (loadState().partial && !loadState().complete) {
                    setModalConfirmarCargaParcial(true);
                  } else if (loadState().complete && !loadState().faltaQuienRecibe) {
                    mutation.mutate();
                  } else if (loadState().faltaQuienRecibe) {
                    toast.error("Falta completar el nombre y RUT de quién recibe en local");
                  }
                }}
                disabled={!loadState().complete && !loadState().partial}>
                <FaRoadCircleCheck className="text-4xl pb-0" />
                <p className="ml-2 mt-2 text-md font-bold">
                  {loadState().complete ? 'CARGA COMPLETA' : loadState().partial ? 'CARGA PARCIAL' : 'CARGA NO INICIADA'}
                </p>
                {mutation.isPending && <div className="absolute w-full top-0">
                  <div className="w-full h-12 bg-gray-100 opacity-80"></div>
                  <div className="absolute top-2 w-full"><Loader texto="" /></div>
                </div>}
              </button>
            </div>
            <div className="flex items-center w-full mb-2 px-2">
              <div className="flex-1 h-4 bg-gray-300 rounded overflow-hidden">
                <div
                  className="h-4 bg-green-500"
                  style={{ width: `${loadState().porcentaje}%` }}
                ></div>
              </div>
              <div className="ml-2 w-12 text-right font-bold text-gray-400 orbitron">
                {loadState().porcentaje}%
              </div>
            </div>
          </div>}


          {index === 0 && inputTemporalVisible && <div className="absolute bottom-3 w-full pr-8 text-center pt-2">
            <label className="text-gray-600 text-sm mb-2">Ingrese código:</label>
            <input
              ref={temporalRef}
              type="text"
              className="border border-gray-300 rounded-lg px-3 py-2 w-64"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  console.log("Código temporal ingresado:", e.currentTarget.value);
                  setInputTemporalVisible(false);
                  e.currentTarget.value = '';
                }
              }}
            />
          </div>}
          
        </div>
      </div>
    )}

    {index === 0 && modalConfirmarCargaParcial && <ModalConfirmarCargaParcial
      onClose={() => setModalConfirmarCargaParcial(false)}
      onConfirm={async () => {
        setModalConfirmarCargaParcial(false);
        await mutation.mutateAsync();
      }}
    />}

    {index === 0 && showModalNombreRetira && <QuienRecibeModal
      ventaId={selectedVentaId || ""}
      onClose={() => {
        setShowModalNombreRetira(false);
        setSelectedVentaId(null);
      }}
    />}
  </div>);
}