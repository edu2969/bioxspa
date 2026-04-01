"use client";

import { useEffect, useRef, useState } from "react";
import Loader from "./Loader";
import { FaClipboardCheck } from "react-icons/fa";
import { Toaster } from 'react-hot-toast';
import dayjs from "dayjs";
import 'dayjs/locale/es';
dayjs.locale('es');
var relative = require('dayjs/plugin/relativeTime');
dayjs.extend(relative);
import { useQuery, useQueryClient } from "@tanstack/react-query";
import GestorDeCargaView from "./_prefabs/GestorDeCargaView";
import PowerScanView from "./_prefabs/powerScan/PowerScanView";
import Nav from "./Nav";
import { ICargaDespachoView } from "@/types/types";
import SoundPlayerProvider from "./context/SoundPlayerContext";
import { useRealtimeQuery } from "@/hooks/useRealtimeQuery";
import { useAuthorization } from "@/hooks/useAuth";

function getFirstVentaId(cargamento: ICargaDespachoView | null | undefined) {
  return cargamento?.clientes?.flatMap((cliente) => cliente.ventas)?.[0]?.ventaId || null;
}

function getAllVentaIdsKey(cargamento: ICargaDespachoView | null | undefined) {
  if (!cargamento) return null;

  const ventaIds = cargamento.clientes
    ?.flatMap((cliente) => cliente.ventas)
    ?.map((venta) => venta.ventaId)
    ?.filter(Boolean) || [];

  if (!ventaIds.length) return null;

  return ventaIds.join("|");
}

function getCargaId(cargamento: ICargaDespachoView | null | undefined) {
  if (!cargamento) return null;
  return cargamento.rutaDespachoId || `local_${getAllVentaIdsKey(cargamento) || getFirstVentaId(cargamento) || "sin-venta"}`;
}

function orderCargamentosByPrevious(
  incoming: ICargaDespachoView[] = [],
  previousOrder: string[] = []
) {
  if (!incoming.length) return [];
  if (!previousOrder.length) return incoming;

  const orderIndex = new Map(previousOrder.map((id, idx) => [id, idx]));

  return [...incoming].sort((a, b) => {
    const aId = getCargaId(a);
    const bId = getCargaId(b);
    const aIdx = aId ? orderIndex.get(aId) : undefined;
    const bIdx = bId ? orderIndex.get(bId) : undefined;

    if (aIdx !== undefined && bIdx !== undefined) return aIdx - bIdx;
    if (aIdx !== undefined) return -1;
    if (bIdx !== undefined) return 1;
    return 0;
  });
}

export default function JefaturaDespacho() {
  const [scanMode, setScanMode] = useState(false);
  const [rutaId, setRutaId] = useState<string | null>(null);
  const [ventaId, setVentaId] = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);
  const previousOrderRef = useRef<string[]>([]);

  const auth = useAuthorization();
  const userId = auth.user?.id || null;

  const queryClient = useQueryClient();

  useRealtimeQuery({
    channelName: `cargamentos-despacho-ruta-${userId}`,
    schema: 'public',
    table: 'rutas_despacho',
    event: '*',
    queryKeys: [['cargamentos-despacho', userId]],
    enabled: !!userId
  });

  useRealtimeQuery({
    channelName: `ventas-despacho-${userId}`,
    schema: 'public',
    table: 'ventas',
    event: '*',
    queryKeys: [['cargamentos-despacho', userId]],
    enabled: !!userId
  });

  useRealtimeQuery({
    channelName: `ventas-rutas-despacho-${userId}`,
    schema: 'public',
    table: 'ruta_despacho_ventas',
    event: '*',
    queryKeys: [['cargamentos-despacho', userId]],
    enabled: !!userId
  });

  const { data: cargamentos, isLoading } = useQuery<ICargaDespachoView[]>({
    queryKey: ['cargamentos-despacho', userId],
    queryFn: async () => {
      const response = await fetch(`/api/pedidos/despacho?usuarioId=${userId}`, {
        cache: 'no-store'
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch cargamentos");
      }
      const data = await response.json();
      console.log("Cargamentos de despacho:", data);
      return data.cargamentos || [];
    },
    select: (incoming) => orderCargamentosByPrevious(incoming || [], previousOrderRef.current),
    enabled: !!userId
  });

  useEffect(() => {
    if (!cargamentos || !cargamentos.length) {
      previousOrderRef.current = [];
      return;
    }

    previousOrderRef.current = cargamentos
      .map((cargamento) => getCargaId(cargamento))
      .filter((id): id is string => !!id);
  }, [cargamentos]);

  const handleShowNext = () => {
    if (!cargamentos || cargamentos.length <= 1 || animating) return;

    console.log("Mostrar siguiente cargamento");
    setAnimating(true);

    setTimeout(() => {
      // Crear nuevo array moviendo el primer elemento al final
      const nuevosCargamentos = [...cargamentos];
      const primerCargamento = nuevosCargamentos.shift(); // Remover primer elemento
      if (primerCargamento) {
        nuevosCargamentos.push(primerCargamento); // Agregarlo al final
      }

      // Actualizar la query data con el nuevo orden
      queryClient.setQueryData(['cargamentos-despacho', userId], nuevosCargamentos);

      previousOrderRef.current = nuevosCargamentos
        .map((cargamento) => getCargaId(cargamento))
        .filter((id): id is string => !!id);

      // Actualizar rutaId/ventaId basado en el nuevo primer cargamento
      if (nuevosCargamentos.length > 0) {
        const newFirstCarga = nuevosCargamentos[0];
        if (!newFirstCarga.rutaDespachoId) {
          setVentaId(getFirstVentaId(newFirstCarga));
          setRutaId(null);
        } else {
          setRutaId(newFirstCarga.rutaDespachoId);
          setVentaId(null);
        }
      }

      setAnimating(false);
      setScanMode(false);
    }, 1000);
  };

  // Establecer rutaId/ventaId inicial cuando se cargan los cargamentos
  useEffect(() => {
    if (cargamentos && cargamentos.length > 0) {
      const firstCarga = cargamentos[0];
      if (!firstCarga.rutaDespachoId) {
        setVentaId(getFirstVentaId(firstCarga));
        setRutaId(null);
      } else {
        setRutaId(firstCarga.rutaDespachoId);
        setVentaId(null);
      }
    }
  }, [cargamentos?.length]); // Solo ejecutar cuando cambie la cantidad de cargamentos

  return <>
    {isLoading && (
      <div className="absolute w-full h-screen flex items-center justify-center">
        <Loader texto="Cargando pedidos" />
      </div>
    )}

    {!isLoading && (!cargamentos || cargamentos?.length === 0) &&
      <div className="w-full h-screen py-6 px-12 bg-white mx-auto flex flex-col justify-center items-center">
        <FaClipboardCheck className="text-8xl text-green-500 mb-4 mx-auto" />
        <p className="text-center text-2xl font-bold mb-4">¡TODO EN ORDEN!</p>
      </div>
    }

    {!isLoading && !!cargamentos?.length && (
      <div className="w-full h-screen text-center" style={{ width: "100vw", maxWidth: "100vw", overflowX: "hidden", overflowY: "hidden" }}>
        {scanMode &&
          <SoundPlayerProvider>
            <PowerScanView setScanMode={setScanMode}
              scanMode={scanMode}
              rutaId={rutaId} ventaId={ventaId}
              operacion={`${rutaId ? 'cargar' : 'entregarEnLocal'}`} />
          </SoundPlayerProvider>}

        <div className="w-full">
          {!isLoading && cargamentos && cargamentos.map((cargamento, index) => (
            <div key={`cargamento_${cargamento.rutaDespachoId || getFirstVentaId(cargamento) || index}_${index}`}
              className="flex flex-col h-full overflow-y-hidden">
              <div className={`absolute w-11/12 md:w-9/12 h-[calc(100vh-114px)] bg-gray-100 shadow-lg rounded-lg py-1 ${animating ? "transition-all duration-500" : ""}`}
                style={{
                  top: `${animating && index > 0 ? (index - 1) * 10 + 52 : index * 10 + 52}px`,
                  left: `${animating && index > 0 ? (index - 1) * 10 + 16 : index * 10 + 16}px`,
                  zIndex: animating && index > 0 ? cargamentos.length - index + 1 : cargamentos.length - index,
                  scale: animating && index > 0 ? 1 - (index - 1) * 0.009 : 1 - index * 0.009,
                  transform: `translateX(${animating && index == 0 ? "-100%" : "0"})`,
                  opacity: animating && index == 0 ? 0 : 1,
                }}
              >
                {index <= 1 &&
                  <GestorDeCargaView
                    cargamentos={[cargamento]}
                    setScanMode={setScanMode}
                    index={index}
                  />}
              </div>
            </div>
          ))}
        </div>

        {cargamentos && cargamentos.length > 1 && <div className="fixed bottom-2 right-4 z-40">
          <button
            className="flex items-center px-6 py-3 bg-white text-gray-500 border border-gray-300 rounded-xl shadow-lg font-bold text-lg hover:bg-gray-100 transition duration-200"
            style={{ minWidth: 220 }}
            onClick={handleShowNext}
            disabled={animating || cargamentos.length === 0}
          >
            PASAR SIGUIENTE &gt;&gt;
          </button>
        </div>}

      </div>)}
    <Toaster />
    <Nav />

  </>;
}


