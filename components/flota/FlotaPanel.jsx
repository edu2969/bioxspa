"use client";
import { useEffect, useState } from 'react';
import Image from 'next/image';
import React from 'react';
import { useRouter } from 'next/navigation';
import { SiFord, SiHyundai, SiKia, SiMitsubishi, SiVolkswagen } from 'react-icons/si';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { FaTrashAlt } from 'react-icons/fa';
import { ConfirmModal } from '../modals/ConfirmModal';
dayjs.locale('es');
var relative = require('dayjs/plugin/relativeTime');
dayjs.extend(relative);

export default function FlotaPanel() {
    const [loadingPanel, setLoadingPanel] = useState(true);
    const [vehiculos, setVehiculos] = useState([]);
    const [showConfirm, setShowConfirm] = useState(false);
    const [vehiculoToDelete, setVehiculoToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const router = useRouter();

    const fetchVehiculos = async () => {
        try {
            const response = await fetch('/api/flota');
            const data = await response.json();
            setVehiculos(data.vehiculos);
            console.log("Vehiculos fetched:", data.vehiculos);
        } catch (error) {
            console.error('Error fetching vehiculos:', error);
        } finally {
            setLoadingPanel(false);
        }
    };

    const deleteVehiculo = async (vehiculoId) => {
        try {
            const response = await fetch(`/api/flota/${vehiculoId}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                setVehiculos(vehiculos.filter(v => v._id !== vehiculoId));
            } else {
                console.error('Failed to delete vehiculo');
            }
        } catch (error) {
            console.error('Error deleting vehiculo:', error);
        }
    };

    useEffect(() => {
        fetchVehiculos();
    }, []);

    return (
        <main className="mt-12 h-[calc(100vh-64px)] overflow-y-auto">
            <div className="grid grid-cols-5 h-full gap-4 p-4">
                {!loadingPanel && vehiculos.length > 0 && vehiculos.map((vehiculo, index) => (
                <div key={index} className="relative w-full border rounded-lg p-4 bg-white shadow-md hover:shadow-xl transition-shadow duration-300 hover:bg-gray-100 cursor-pointer"
                onClick={() => router.push(`/modulos/configuraciones/flota/${vehiculo._id}`)}>
                    <Image className="absolute top-0 left-0 ml-12 mt-6" src={`/ui/${vehiculo.marca.split(" ")[0].toLowerCase() + "_" + vehiculo.modelo.split(" ")[0].toLowerCase()}.png`} alt="camion" width={188} height={146} />
                    <Image className="absolute top-0 left-0 ml-12 mt-6" src={`/ui/${vehiculo.marca.split(" ")[0].toLowerCase() + "_" + vehiculo.modelo.split(" ")[0].toLowerCase()}_front.png`} alt="camion_frontal" width={188} height={146} />
                    <div className="absolute -left-3 top-2 bg-white">
                        <div className="flex ml-5 text-slate-800 border-black border-2 px-1 py-0 rounded">
                            <p className="text-lg font-bold">{vehiculo.patente.substring(0, 2)}</p>
                            <Image className="inline-block mx-0.5 py-2" src="/ui/escudo.png" alt="escudo chile" width={12} height={9} />
                            <p className="text-lg font-bold">{vehiculo.patente.substring(2)}</p>
                        </div>
                    </div>
                    <div className="mt-40">
                        <div className="flex text-blue-800 bg-white">
                            {vehiculo.marca.split(" ")[0].toLowerCase() === "hyundai" && <SiHyundai size={"2rem"}/>}
                            {vehiculo.marca.split(" ")[0].toLowerCase() === "volkswagen" && <SiVolkswagen size={"2rem"}/>}
                            {vehiculo.marca.split(" ")[0].toLowerCase() === "ford" && <SiFord size={"2rem"}/>}
                            {vehiculo.marca.split(" ")[0].toLowerCase() === "mitsubishi" && <SiMitsubishi size={"2rem"}/>}
                            {vehiculo.marca.split(" ")[0].toLowerCase() === "kia" && <SiKia size={"2rem"}/>}
                            <p className="text-xl orbitron ml-2">{vehiculo.marca.split(" ")[0]}</p>
                            <p className="text-sm orbitron ml-2 mt-0.5 pt-1">{vehiculo.modelo.split(" ")[0]}</p>
                        </div>
                        <div className="flex flex-col">                            
                            <p className="text-red-700 font-bold text-sm">Revisión técnica: </p>
                            <div className="flex">
                                <p className="orbitron text-md mr-2">{dayjs(vehiculo.revisionTecnica).format("MMM/YYYY")}</p>
                                <p className="text-xs mr-2 pt-[5px]">{dayjs(vehiculo.revisionTecnica).fromNow()}</p>
                            </div>
                        </div>                        
                    </div>
                    <div className="absolute top-3 right-3 text-red-200" onClick={(e) => {
                        e.stopPropagation();                        
                        setVehiculoToDelete(vehiculo._id);
                        setShowConfirm(true);
                    }}>
                        <FaTrashAlt size={"1.5rem"}/>
                    </div>
                </div>
                ))}
                {loadingPanel && <div className="absolute inset-0 bg-white/80 z-50 flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 mb-4"></div>
                    <p className="text-xl font-bold">Cargando panel de flota...</p>
                </div>}
            </div>
           
            <ConfirmModal
                show={showConfirm}
                title="Eliminar Vehículo"
                confirmationQuestion="¿Estás seguro que deseas eliminar este vehículo? Esta acción no se puede deshacer."
                onClose={() => {
                    setShowConfirm(false);
                    setVehiculoToDelete(null);
                }}
                onConfirm={async () => {
                    setDeleting(true);
                    await deleteVehiculo(vehiculoToDelete);
                    setDeleting(false);
                    setShowConfirm(false);
                    setVehiculoToDelete(null);
                }}
                confirmationLabel="Eliminar"
                loading={deleting}
            />
        </main>
    );
}