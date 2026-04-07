import { IDestinoView } from "@/types/types";
import { BsFillGeoAltFill } from "react-icons/bs";
import { FaMapLocationDot } from "react-icons/fa6";

export default function CheckPoint({
    index,
    esTitulo = false,
    isLast,
    destino
}: {
    index: number;
    esTitulo?: boolean;
    isLast: boolean;
    destino: IDestinoView;
}) {
    return (<div key={`ruta_segmento_${index}`} className="flex mt-1 h-12 items-center overflow-hidden">
        <BsFillGeoAltFill size={`${esTitulo ? '1.5rem' : '1.1rem'}`} 
            className={esTitulo ? 'w-8' : 'w-4'} />
        <span className={`${esTitulo ? 'text-2xl w-56' : 'text-xs w-36'} ml-2`}>{destino.direccion
            && destino.direccion.direccionCliente?.split(",").slice(0, 3).join(",")}</span>
        {isLast && <button
            className="bg-blue-400 text-white font-bold rounded-md shadow-md w-10 h-10 pl-2"
            onClick={() => {
                const glosaDestino = `${destino.direccion && destino.direccion.latitud},${destino.direccion && destino.direccion.longitud}`;
                // Google Maps Directions: https://www.google.com/maps/dir/?api=1&destination=lat,lng
                window.open(
                    `https://www.google.com/maps/dir/?api=1&destination=${glosaDestino}&travelmode=driving`,
                    "_blank"
                );
            }}
        >
            <FaMapLocationDot className="w-7 -ml-0.5" size="1.5rem" />
        </button>}
    </div>);
}