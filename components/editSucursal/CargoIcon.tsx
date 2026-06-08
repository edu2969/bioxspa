import { TIPO_CARGO } from "@/app/utils/constants";
import { FaCrown, FaHandsHelping, FaStar } from "react-icons/fa";
import { RiMoneyDollarCircleFill } from "react-icons/ri";
import { TbBadges, TbMoneybag, TbTruckLoading } from "react-icons/tb";
import { GoCopilot } from "react-icons/go";

const baseClass = "absolute -top-1 left-0 bg-white rounded-full p-0.5 border border-gray-400";

// Single source of truth for the badge shown over a cargo avatar, keyed by tipo.
export default function CargoIcon({ tipo }: { tipo: number }) {
    switch (tipo) {
        case TIPO_CARGO.gerente:
            return <FaCrown className={`text-yellow-600 ${baseClass}`} size="2rem" />;
        case TIPO_CARGO.cobranza:
            return <RiMoneyDollarCircleFill className={`text-gray-500 ${baseClass}`} size="2rem" />;
        case TIPO_CARGO.neo:
            return <TbMoneybag className={`text-black ${baseClass}`} size="2rem" />;
        case TIPO_CARGO.encargado:
            return <FaStar className={`text-blue-500 ${baseClass}`} size="2rem" />;
        case TIPO_CARGO.responsable:
            return <TbBadges className={`text-black ${baseClass}`} size="2rem" />;
        case TIPO_CARGO.conductor:
            return <GoCopilot className={`text-sky-600 ${baseClass}`} size="2rem" />;
        case TIPO_CARGO.proveedor:
            return <FaHandsHelping className={`text-orange-500 ${baseClass}`} size="2rem" />;
        case TIPO_CARGO.despacho:
            return <TbTruckLoading className={`text-black ${baseClass}`} size="2rem" />;
        default:
            return null;
    }
}

// Resolve the avatar path for a usuario from its id, falling back to a placeholder.
export function getUsuarioAvatar(
    usuarios: { id?: string; email: string }[] | undefined,
    usuarioId?: string
) {
    const usuario = usuarios?.find((u) => u.id === usuarioId);
    if (usuario) {
        return `/profiles/${usuario.email.split("@")[0].toLowerCase()}.jpg`;
    }
    return "/profiles/undefined.jpg";
}
