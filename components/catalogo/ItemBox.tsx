import { ReactNode } from "react";
import { IoSettingsOutline } from "react-icons/io5";

export default function ItemBox({
    id,
    index,
    text,
    count,
    onSettingClick,
    onClick
}: {
    id: string;
    index: number;
    text?: ReactNode;
    count?: number;
    onSettingClick: () => void;
    onClick: (id: string) => void;
}) {
    const bubbleText = count !== undefined ? String(count) : text;

    return (<div
        key={index}
        className="relative w-1/6 py-2 px-4 transition-all duration-500 transform hover:text-white cursor-pointer max-h-32 overflow-ellipsis"
        onClick={() => onClick(id)}
    >
        <div className="relative w-full h-full bg-gray-200 hover:bg-gray-500 hover:text-white cursor-pointer rounded-lg p-4 shadow-md text-gray-700">
            <div className="absolute -top-2 -right-2 bg-blue-500 text-white font-bold rounded-full w-6 h-6 flex items-center justify-center text-xs">
                {bubbleText}
            </div>
            <div className="text-center mt-2">
                <p className="text-md font-bold">{text}</p>
            </div>
        </div>
        <IoSettingsOutline className="absolute ml-1 mb-1 left-4 bottom-2 text-gray-400 hover:text-red-600 cursor-pointer" size="1.5rem"
            onClick={(e) => {
                e.stopPropagation();
                onSettingClick?.();
            }} />
    </div>);
}