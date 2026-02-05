import Loader from "@/components/Loader";
import Link from "next/link";
import { IAccessButtonProps } from "./types";

const colors = ["bg-blue-500", "bg-green-500", "bg-yellow-500", "bg-orange-500", "bg-purple-500"];

export default function AccessButton({ props, routingIndex, setRoutingIndex }
    : { props: IAccessButtonProps, routingIndex: number, setRoutingIndex: React.Dispatch<React.SetStateAction<number>> }) {
    return (<div key={props.key} className="relative">
        <Link href={props.href} onClick={() => setRoutingIndex(props.index)}>
            <div className={`w-full shadow-lg rounded-lg py-4 hover:scale-105 border-2 hover:border-blue-100 mb-2 text-center relative ${routingIndex == 0 ? "opacity-20" : ""} ${routingIndex === -1 && props.warningMessage ? "border-red-500 bg-red-200" : ""}`}>
                <div className="w-full inline-flex text-center text-slate-500 p-4 relative">{props.icon}</div>
                <span>{props.label}</span>
            </div>
            <div className={`absolute top-8 left-1/2 ml-12 w-32`}>
                <div className="flex flex-col items-left mr-2 space-y-2">
                    {props.badges && props.badges.map((badged, index) => (<div key={`badged_${index}`} className={`flex ${colors[index % colors.length]} text-white text-xs rounded-full px-3 pr-1.5 h-8`}>
                        <span className="text-lg mr-1"><b>{badged.value}</b></span>
                        {badged.text && <p className="text-md mt-2">{badged.text}</p>}
                    </div>))}
                </div>
            </div>
            {props.warningMessage}
        </Link>
        {routingIndex == props.index && <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="w-full h-full flex items-center justify-center">
                <Loader texto="" />
            </div>
        </div>}
    </div>);
}