"use client";

import { useEffect, useState } from "react";
import Loader from "./Loader";
import { FaClipboardCheck } from "react-icons/fa";
import toast, { Toaster } from 'react-hot-toast';
import dayjs from "dayjs";
import 'dayjs/locale/es';
dayjs.locale('es');
var relative = require('dayjs/plugin/relativeTime');
dayjs.extend(relative);
import { useQuery, useQueryClient } from "@tanstack/react-query";
import GestorDeCargaView from "./prefabs/GestorDeCargaView";
import PowerScanView from "./prefabs/powerScan/PowerScanView";
import Nav from "./Nav";
import { useUser } from "@/components/providers/UserProvider";
import { ICargaDespachoView } from "@/types/types";
import SoundPlayerProvider from "./context/SoundPlayerContext";

export default function JefaturaDespacho() {
  const [scanMode, setScanMode] = useState(false);
  const [rutaId, setRutaId] = useState<string | null>(null);
  const [ventaId, setVentaId] = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);

  const queryClient = useQueryClient();
  const userContext = useUser();

  const { data: cargamentos, isLoading } = useQuery<ICargaDespachoView[]>({
    queryKey: ['cargamentos-despacho'],
    queryFn: async () => {
      if (!userContext || !userContext.session) {
        console.error("No active session");
        throw new Error("User not authenticated");
      }

      const token = userContext.session.access_token;
      const response = await fetch("/api/pedidos/despacho", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch cargamentos");
      }

      const data = await response.json();
      console.log("CARGAMENTOS DE DESPACHO:", data);
      return data.cargamentos;
    },
  });

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
      queryClient.setQueryData(['cargamentos-despacho'], nuevosCargamentos);

      // Actualizar rutaId/ventaId basado en el nuevo primer cargamento
      if (nuevosCargamentos.length > 0) {
        const newFirstCarga = nuevosCargamentos[0];
        if (!newFirstCarga.ruta_id) {
          setVentaId(newFirstCarga.ventas[0]?.venta_id || null);
          setRutaId(null);
        } else {
          setRutaId(newFirstCarga.ruta_id);
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
      if (!firstCarga.ruta_id) {
        setVentaId(firstCarga.ventas[0]?.venta_id || null);
        setRutaId(null);
      } else {
        setRutaId(firstCarga.ruta_id);
        setVentaId(null);
      }
    }
  }, [cargamentos?.length]); // Solo ejecutar cuando cambie la cantidad de cargamentos

  return (
    <div className="w-full h-screen text-center" style={{ width: "100vw", maxWidth: "100vw", overflowX: "hidden", overflowY: "hidden" }}>
      {scanMode && 
      <SoundPlayerProvider>
        <PowerScanView setScanMode={setScanMode}  
          scanMode={scanMode}
          rutaId={rutaId} ventaId={ventaId}
          operacion={`${rutaId ? 'cargar' : 'entregarEnLocal'}`}/>
      </SoundPlayerProvider>}

      <div className="w-full">
        {!isLoading && cargamentos && cargamentos.map((cargamento, index) => (
          <div key={`cargamento_${cargamento.ruta_id || cargamento.ventas[0]?.venta_id}_${index}`} 
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

        {isLoading && (
          <div className="absolute w-full h-screen flex items-center justify-center">
            <Loader texto="Cargando pedidos" />
          </div>
        )}
        
        {!isLoading && cargamentos?.length === 0 &&
          <div className="w-full h-screen py-6 px-12 bg-white mx-auto flex flex-col justify-center items-center">
            <FaClipboardCheck className="text-8xl text-green-500 mb-4 mx-auto" />
            <p className="text-center text-2xl font-bold mb-4">¡TODO EN ORDEN!</p>
          </div>
        }
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

      <Toaster />
      <Nav />
    </div>
  );
}


