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
  const [animating, setAnimating] = useState(false);
  const [scanMode, setScanMode] = useState(false);
  const [rutaId, setRutaId] = useState<string | null>(null);
  const [ventaId, setVentaId] = useState<string | null>(null);

  const { data: cargamentos, isLoading } = useQuery<ICargaDespachoView[]>({
    queryKey: ['cargamentos-despacho'],
    queryFn: async () => {
      const response = await fetch("/api/pedidos/despacho");
      const data = await response.json();
      console.log("Cargamentos de despacho obtenidos:", data.cargamentos);
      return data.cargamentos;
    }
  });

  const handleRemoveFirst = async () => {
    if (animating) return; // Evita múltiples clics durante la animación
    setAnimating(true);
    setTimeout(() => {
      setAnimating(false);
      setScanMode(false);
    }, 1000);
  };

  const handleShowNext = () => {
    if (animating) return; // Evita múltiples clics durante la animación
    setAnimating(true);
    setTimeout(() => {
      setAnimating(false);
      setScanMode(false);
    }, 1000); // Cambia el tiempo de la animación aquí
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
              rutaId={rutaId} ventaId={ventaId}/>
          </SoundPlayerProvider>}

          <div className="w-full md:w-1/2 mx-auto">
            {!isLoading && <GestorDeCargaView cargamentos={cargamentos}
              setScanMode={setScanMode}
              handleRemoveFirst={handleRemoveFirst}
            />}
            {isLoading && (
              <div className="absolute w-full h-screen flex items-center justify-center">
                <Loader texto="Cargando pedidos" />
              </div>
            )}
            {!isLoading && cargamentos?.length === 0 && (
              <div className="absolute w-full h-screen flex items-center justify-center">
                <div className="text-center">
                  <FaClipboardCheck className="text-8xl mx-auto mb-4 text-green-500" />
                  <div className="text-2xl font-bold text-gray-500">TODO EN ORDEN {cargamentos.length}</div>
                </div>
              </div>
            )}
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
        </div>
      </ChecklistProvider>
      <Nav />
    </SessionProvider>
  );
}


/*


    const handleUpdateItem = async (item) => {
        setCorrigiendo(true);
        try {
            const response = await fetch("/api/items/corregir", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    id: item.itemId,
                    estado: item.estado || TIPO_ESTADO_ITEM_CATALOGO.no_aplica,
                    reubicar: moverCilindro,
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                toast.error(`Error al corregir: ${data.error || "Error desconocido"}`);
            } else {
                setShowModalCilindroErroneo(false);
                setMoverCilindro(false);
                item.direccionInvalida = false;
                moverItem(item, item.codigo);
                setItemCatalogoEscaneado(null);
            }
        } catch {
            toast.error("Error de red al corregir cilindro");
        } finally {
            setEditMode(true);
            setCorrigiendo(false);
        }
    }*/