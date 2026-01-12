"use client";

import { useEffect, useRef, useState } from "react";
import Loader from "./Loader";
import { FaClipboardCheck } from "react-icons/fa";
import toast, { Toaster } from 'react-hot-toast';
import dayjs from "dayjs";
import 'dayjs/locale/es';
dayjs.locale('es');
var relative = require('dayjs/plugin/relativeTime');
dayjs.extend(relative);
import { useQuery } from "@tanstack/react-query";
import GestorDeCargaView from "./prefabs/GestorDeCargaView";
import PowerScanView from "./prefabs/powerScan/PowerScanView";
import Nav from "./Nav";
import { SessionProvider } from "next-auth/react";
import { ChecklistProvider } from "./context/ChecklistContext";
import { ICargaDespachoView } from "@/types/types";
import SoundPlayerProvider from "./context/SoundPlayerContext";

export default function JefaturaDespacho() {
  const [scanMode, setScanMode] = useState(false);
  const [rutaId, setRutaId] = useState<string | null>(null);
  const [ventaId, setVentaId] = useState<string | null>(null);

  const { data: cargamentos, isLoading } = useQuery<ICargaDespachoView[]>({
    queryKey: ['cargamentos-despacho'],
    queryFn: async () => {
      const response = await fetch("/api/pedidos/despacho");
      const data = await response.json();
      console.log("CARGAMENTOS DE DESPACHO:", data);
      return data.cargamentos;
    }
  });

  const handleShowNext = () => {
    console.log("Mostrar siguiente cargamento");
    // Esta función ahora solo cambia el orden de visualización sin animaciones
    // La data real se maneja desde GestorDeCargaView con setQueryData
  }

  useEffect(() => {
    if(cargamentos && cargamentos.length > 0) {
      const firstCarga = cargamentos[0];
      
      if(!firstCarga.rutaId) {
        setVentaId(firstCarga.ventas[0].ventaId);
      } else {
        setRutaId(firstCarga.rutaId);
      }
    }
  }, [cargamentos]);

  return (
    <SessionProvider>
      <ChecklistProvider tipo="personal">
        <div className="w-full h-screen text-center" style={{ width: "100vw", maxWidth: "100vw", overflowX: "hidden", overflowY: "hidden" }}>
          {scanMode && 
          <SoundPlayerProvider>
            <PowerScanView setScanMode={setScanMode}  
              scanMode={scanMode}
              rutaId={rutaId} ventaId={ventaId}
              operacion="cargar"/>
          </SoundPlayerProvider>}

          <div className="w-full">
            {!isLoading && cargamentos && cargamentos.map((cargamento, index) => (
              <div key={`cargamento_${index}`} className="flex flex-col h-full overflow-y-hidden">
                <div className="absolute w-11/12 md:w-9/12 h-[calc(100vh-114px)] bg-gray-100 shadow-lg rounded-lg p-1"
                  style={{
                    top: `${index * 10 + 52}px`,
                    left: `${index * 10 + 16}px`,
                    zIndex: cargamentos.length - index,
                    scale: 1 - index * 0.009,
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
              disabled={cargamentos.length === 0}
            >
              PASAR SIGUIENTE &gt;&gt;
            </button>
          </div>}

          <Toaster />
        </div>
      </ChecklistProvider>
      <Nav />
    </SessionProvider>
  );
}


