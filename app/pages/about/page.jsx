"use client";

import Image from "next/image";

export default function About() {
    return (
        <div className="w-screen h-screen">
            <div className="h-screen flex justify-center items-center animate-entrance">
                <div className="scale-75 sm:scale-100">
                    <div className="flex">
                        <p className="text-6xl text-gray-700 mb-6" style={{ transform: "scaleY(1.5)" }}>BIOX</p>
                        <span className="flex text-xs ml-7 text-gray-400 mt-10">
                            versión 0.92a
                            <div className="cursor-pointer text-xs ml-2" onClick={() => fetch("/api/bi/cilindros/init")}>
                                🪰
                            </div>
                        </span>
                    </div>
                    <div className="ml-2 opacity-90 text-right">
                        <span>Powered By</span>                        
                        <Image className="grayscale float-right ml-4" src="/yga-logo.png" width={111} height={200} alt="yGa - Icon" />                        
                        <div className="flex text-sm">
                            <p className="text-xs">Contáctenos a <a className="text-blue-800" href="mailto:contacto@yga.cl">contacto@yga.cl</a></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}