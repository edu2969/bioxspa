"use client"
import Image from 'next/image';
import { BsFillClipboard2CheckFill, BsFire, BsQrCodeScan } from "react-icons/bs";
import { FaB, FaLocationDot } from 'react-icons/fa6';
import { TbAwardOff } from 'react-icons/tb';
import { Dialog, DialogTitle } from "@headlessui/react";
import { FiSave, FiX } from "react-icons/fi";
import { useState, useEffect } from 'react';
import { PiBatteryVerticalFullBold } from 'react-icons/pi';

export default function OperationPanel() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [qrLeido, setQrLeido] = useState(false);
    const [setInputValue] = useState('');

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setQrLeido(false);
        setInputValue('');
    };

    const handleSaveEvent = async () => {
        console.log("Saving event...");
    };

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (isDialogOpen) {
                if (event.key === 'Enter') {
                    setQrLeido(true);
                } else if (/^\d$/.test(event.key)) {
                    setInputValue((prev) => prev + event.key);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isDialogOpen, setInputValue]);

    return (
        <div className="w-full h-screen p-4">
            <div className="w-full h-1/2">
                <div className="absolute w-1/3 h-1/2">
                    {Array.from({ length: 20 }).map((_, layerIndex) => (
                        <div key={`${layerIndex}_planta`} className="absolute flex" style={{ top: (60 + layerIndex * 5) + 'px', left: (220 - 10 * layerIndex) + 'px', transform: 'translateX(' + (layerIndex * 10) + ')' }}>
                            {Array.from({ length: 15 }).map((_, index) => (index + layerIndex * 15 < 222) && (
                                <Image
                                    key={index}
                                    src={`/ui/tanque_biox${(index + layerIndex * 20 > 124) ? '_verde' : (index + layerIndex * 20 > 84) ? '_amarillo' : (index + layerIndex * 20 > 62) ? '_rojo' : ''}.png`}
                                    alt={`tank_${layerIndex * 5 + index}`}
                                    width={15}
                                    height={83}
                                    className='mr-0.5 relative'
                                    style={{ top: (index * 5) + 'px' }}
                                    priority={true}
                                />
                            ))}
                        </div>
                    ))}
                    <div className="mt-56 ml-6">
                        <p className="font-bold text-lg">INGRESO</p>
                        <div className="flex text-green-600">
                            <BsFillClipboard2CheckFill className="text-md mt-0.5 mr-2" />
                            <p className="orbitron text-md mr-2">96</p>
                            <p className="text-xs mr-2 mt-1">LLENOS</p>
                        </div>
                        <div className="flex text-blue-600">
                            <FaB className="text-md mt-0.5 mr-2" />
                            <p className="orbitron text-md mr-2">13</p>
                            <p className="text-xs mr-1 mt-1">BIOX</p>
                        </div>
                        <div className="flex text-orange-500">
                            <TbAwardOff className="text-md mt-0.5 mr-2" />
                            <p className="orbitron text-md mr-2">8</p>
                            <p className="text-xs mr-1 mt-1">x VENCER</p>
                        </div>
                        <div className="flex text-orange-500">
                            <BsFire className="text-md mt-0.5 mr-2" />
                            <p className="orbitron text-md mr-2">2</p>
                            <p className="text-xs mr-1 mt-1">x VENCIDOS</p>
                        </div>
                    </div>
                </div>
                <div className="absolute w-1/3 h-1/2 left-1/3">
                    {Array.from({ length: 10 }).map((_, layerIndex) => (
                        <div key={`${layerIndex}_vacios`} className="absolute flex" style={{ top: (90 + layerIndex * 5) + 'px', left: (120 - 10 * layerIndex) + 'px', transform: 'translateX(' + (layerIndex * 10) + ')' }}>
                            {Array.from({ length: 10 }).map((_, index) => (index + layerIndex * 10 < 82) && (
                                <Image
                                    key={index}
                                    src={`/ui/tanque_biox${(index + layerIndex * 20 > 64) ? '_verde' : (index + layerIndex * 20 > 40) ? '_amarillo' : (index + layerIndex * 20 > 6) ? '_azul' : ''}.png`}
                                    alt={`tank_${layerIndex * 5 + index}`}
                                    width={15}
                                    height={83}
                                    className='mr-0.5 relative'
                                    style={{ top: (index * 5) + 'px' }}
                                    priority={true}
                                />
                            ))}
                        </div>
                    ))}
                    <div className="mt-56 ml-6">
                        <p className="font-bold text-lg">LLENADO</p>
                        <div className="flex text-green-600">
                            <BsFillClipboard2CheckFill className="text-md mt-0.5 mr-2" />
                            <p className="orbitron text-md mr-2">96</p>
                            <p className="text-xs mr-2 mt-1">LLENOS</p>
                        </div>
                        <div className="flex text-blue-600">
                            <FaB className="text-md mt-0.5 mr-2" />
                            <p className="orbitron text-md mr-2">13</p>
                            <p className="text-xs mr-1 mt-1">BIOX</p>
                        </div>
                        <div className="flex text-orange-500">
                            <TbAwardOff className="text-md mt-0.5 mr-2" />
                            <p className="orbitron text-md mr-2">8</p>
                            <p className="text-xs mr-1 mt-1">x VENCER</p>
                        </div>
                        <div className="flex text-orange-500">
                            <BsFire className="text-md mt-0.5 mr-2" />
                            <p className="orbitron text-md mr-2">2</p>
                            <p className="text-xs mr-1 mt-1">x VENCIDOS</p>
                        </div>
                    </div>
                </div>
                <div className="absolute w-1/3 h-1/2 left-2/3">
                    {Array.from({ length: 10 }).map((_, layerIndex) => (
                        <div key={`${layerIndex}_llenos`} className="absolute flex" style={{ top: (90 + layerIndex * 5) + 'px', left: (120 - 10 * layerIndex) + 'px', transform: 'translateX(' + (layerIndex * 10) + ')' }}>
                            {Array.from({ length: 15 }).map((_, index) => (
                                <Image
                                    key={index}
                                    src="/ui/tanque_biox.png"
                                    alt={`tank_${layerIndex * 5 + index}`}
                                    width={15}
                                    height={83}
                                    className='mr-0.5 relative'
                                    style={{ top: (index * 5) + 'px' }}
                                    priority={true}
                                />
                            ))}
                        </div>
                    ))}
                    <div className="mt-56 ml-6">
                        <p className="font-bold text-lg">SALIDA</p>
                        <div className="flex text-green-600">
                            <BsFillClipboard2CheckFill className="text-md mt-0.5 mr-2" />
                            <p className="orbitron text-md mr-2">96</p>
                            <p className="text-xs mr-2 mt-1">LLENOS</p>
                        </div>
                        <div className="flex text-blue-600">
                            <FaB className="text-md mt-0.5 mr-2" />
                            <p className="orbitron text-md mr-2">13</p>
                            <p className="text-xs mr-1 mt-1">BIOX</p>
                        </div>
                        <div className="flex text-orange-500">
                            <TbAwardOff className="text-md mt-0.5 mr-2" />
                            <p className="orbitron text-md mr-2">8</p>
                            <p className="text-xs mr-1 mt-1">x VENCER</p>
                        </div>
                        <div className="flex text-orange-500">
                            <BsFire className="text-md mt-0.5 mr-2" />
                            <p className="orbitron text-md mr-2">2</p>
                            <p className="text-xs mr-1 mt-1">x VENCIDOS</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-full flex h-1/2">
                {['HZ2333', 'DKLP44', 'FJKD88', 'DD4523', 'ADG988', 'FFGH99'].map((patente, i) => (
                    <div className="w-1/6" key={patente}>
                        <div className={`relative -left-10`}>
                            <Image className="absolute top-0 left-0 ml-12 mt-2" src="/ui/camion.png" alt="camion" width={250} height={194} />
                            {Array.from({ length: 10 }).map((_, layerIndex) => (
                                <div key={`${layerIndex}_${patente}_${i}`} className="absolute flex" style={{
                                    top: (0 + layerIndex * 4) + 'px',
                                    left: (180 - 10 * layerIndex) + 'px'
                                }}>
                                    {Array.from({ length: 6 }).map((_, index) => (index + layerIndex * 6 < 45) && (
                                        <Image
                                            key={index}
                                            src="/ui/tanque_biox.png"
                                            alt={`tank_${layerIndex * 5 + index}`}
                                            width={15}
                                            height={83}
                                            className='relative'
                                            style={{ top: (index * 5) + 'px' }}
                                            priority={true}
                                        />
                                    ))}
                                </div>
                            ))}
                            <Image className="absolute top-0 left-0 ml-12 mt-2" src="/ui/camion_front.png" alt="camion" width={250} height={194} />
                        </div>
                        <div className="absolute ml-10" style={{ transform: "translate(90px, 50px) skew(0deg, -20deg)" }}>
                            <div className="text-green-500">
                                <p className="text-xs mr-2 mt-3">Rev.Tec:</p>
                                <p className="font-bold text-xs mr-2">13/MAR/2025</p>
                            </div>
                        </div>
                        <div className="mt-52 ml-8">
                            <p className="font-bold text-2xl ml-8">{patente}</p>
                            <div className="flex text-green-600">
                                <BsFillClipboard2CheckFill className="text-2xl mt-0.5 mr-2" />
                                <p className="orbitron text-2xl mr-2">96</p>
                                <p className="text-xs mr-2 mt-3">LLENOS</p>
                            </div>
                            <div className="flex text-blue-600">
                                <FaB className="text-2xl mt-0.5 mr-2" />
                                <p className="orbitron text-2xl mr-2">13</p>
                                <p className="text-xs mr-2 mt-3">BIOX</p>
                            </div>
                            <div className="flex text-orange-500">
                                <TbAwardOff className="text-2xl mt-0.5 mr-2" />
                                <p className="orbitron text-2xl mr-2">8</p>
                                <p className="text-xs mr-2 mt-3">x VENCER</p>
                            </div>
                            <div className="flex text-orange-500">
                                <BsFire className="text-2xl mt-0.5 mr-2" />
                                <p className="orbitron text-2xl mr-2">2</p>
                                <p className="text-xs mr-2 mt-3">x VENCIDOS</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="fixed right-4 top-20">
                <BsQrCodeScan className="text-white bg-blue-500 p-2 rounded-full cursor-pointer hover:bg-blue-700" size="4rem"
                    onClick={() => setIsDialogOpen(true)} />
                <p className='text-xs text-center mt-1'>SCAN QR</p>
            </div>

            <Dialog
                open={isDialogOpen}
                onClose={handleCloseDialog}
                className="fixed z-20 inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50"
            >
                <div className="bg-white rounded p-6 mx-auto w-1/3">
                    <div className="relative h-0 flex justify-end">
                        <button
                            onClick={handleCloseDialog}
                            className="text-gray-500 hover:text-gray-800"
                        >
                            <FiX className="h-6 w-6" />
                        </button>
                    </div>
                    <DialogTitle className="font-bold text-lg">QR SCAN</DialogTitle>

                    <div className="mt-4">
                        {qrLeido ? <div className="flex items-center">
                                <Image src="/ui/tanque_biox.png" alt="tank" width={30} height={50} />
                                <div className="ml-4">
                                    <p className="text-2xl font-bold">N02 (Nitrógeno)</p>
                                    <p className="text-sm">propiedad de BIOX</p>
                                    <div className="flex items-center mt-2">
                                        <BsFillClipboard2CheckFill className="text-green-600 mr-2" />
                                        <p className="text-lg">100%</p>
                                    </div>
                                    <div className="flex items-center mt-2">
                                        <FaLocationDot className="text-blue-600 mr-2" />
                                        <p className="text-lg">en zona de INGRESO</p>
                                    </div>
                                    <div className="flex items-center mt-2 text-red-600">
                                        <BsFire className="mr-2" />
                                        <p className="text-lg">VENCIDO 11/ENE &apos;24</p>
                                    </div>
                                </div>
                            </div> : <div className="flex flex-col items-center">                            
                            <BsQrCodeScan className="text-blue-500" size="6rem" />
                            <p className="text-lg mt-2">INICIE ESCANEO</p>
                        </div>}
                    </div>

                    <div className="mt-4 flex justify-end space-x-2">
                        <button
                            onClick={handleCloseDialog}
                            className="flex w-1/2 items-center px-4 py-2 bg-blue-500 text-white rounded">
                            <FaLocationDot className="mr-2" /> Rehubicar
                        </button>
                        <button
                            onClick={handleSaveEvent}
                            className="flex w-1/2 items-center px-4 py-2 bg-green-500 text-white rounded">
                            <PiBatteryVerticalFullBold className="mr-2" /> Marcar Lleno
                        </button>
                    </div>
                    <div className="mt-4 flex justify-end space-x-2">
                        <button
                            onClick={handleSaveEvent}
                            className="flex w-1/2 items-center px-4 py-2 bg-yellow-500 text-white rounded">
                            <FiSave className="mr-2" /> Certificar
                        </button>
                        <button
                            onClick={handleCloseDialog}
                            className="flex w-1/2 items-center px-4 py-2 bg-red-600 text-white rounded">
                            <FiX className="mr-2" /> Cancelar
                        </button>
                    </div>
                </div>
            </Dialog>
        </div>
    );
}