import { TIPO_ORDEN } from "@/app/utils/constants";
import { IPedidoConductor } from "@/types/types";
import { useDraggable } from "@dnd-kit/core";
import { MdDragIndicator } from "react-icons/md";
import { VscCommentDraft, VscCommentUnresolved } from "react-icons/vsc";

// Componente para pedidos individuales dentro de conductores
export default function PedidoEnConductor({ pedido, choferId, onShowDetalle, onShowCommentModal, onSaveComment, indexPedido }: {
    pedido: IPedidoConductor; // TODO: crear interfaz específica
    choferId: string;
    onShowDetalle: () => void;
    onShowCommentModal: (ventaId: string, comentario?: string | null, onSaveComment?: () => void) => void;
    onSaveComment: () => void;
    indexPedido: number;
}) {
    const {
        attributes: dragAttributes,
        listeners: dragListeners,
        setNodeRef: setDragRef,
        transform,
        isDragging
    } = useDraggable({
        id: pedido.id
    });

    const dragStyle = {
        // No aplicar transform para que quede anclado
        opacity: isDragging ? 0.7 : 1,
    };

    const handleClick = () => {
        if (!isDragging) {
            console.log("👆 CLICK EVENT");
            onShowDetalle();
        }
    };

    const handleCommentClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isDragging) {
            console.log("💬 COMMENT CLICK EVENT");
            onShowCommentModal(pedido.id, pedido.comentario, onSaveComment);
        }
    };

    return (
        <div 
            ref={setDragRef}
            style={dragStyle}
            className="cursor-pointer bg-green-600 rounded shadow-md py-1 pl-2 pr-10 mb-2 mt-2 relative"
            onClick={handleClick}
        >
            <div className="flex w-full" key={`pedido_chofer_${choferId}_${indexPedido}`}>
                <div className='w-full'>
                    <p className="font-md uppercase font-bold text-nowrap overflow-hidden text-ellipsis whitespace-nowrap w-11/12">{pedido.nombre_cliente}</p>
                    {pedido.tipo === TIPO_ORDEN.traslado && <span className="text-xs text-green-800 rounded-sm bg-green-200 px-2 ml-2 font-bold">RETIRO DE CILINDROS</span>}                    
                </div>
                <div className={`${pedido.comentario ? 'text-green-300' : 'text-green-800'} w-1/12`}>
                    <div className="relative">
                        <div className="mr-2 cursor-pointer" onClick={handleCommentClick}>
                            {!pedido.comentario ? <VscCommentDraft size="2.5rem" /> : <VscCommentUnresolved size="2.5rem" />}
                        </div>
                        {pedido.comentario && <div className="absolute top-[22px] left-[22px] w-[15px] h-[15px] rounded-full bg-red-600"></div>}
                    </div>
                </div>
            </div>
            <ul className="list-disc ml-4 -mt-4">
                {pedido.items?.map((item: unknown, indexItem: number) => <li key={`item_en_espera_${indexItem}`}>{(item as any).cantidad}x {(item as any).nombre}</li>)}
            </ul>
            
            {/* INDICADOR DE DRAG - A LA DERECHA DEL COMENTARIO */}
            <div 
                className="absolute top-1 right-1 text-green-200 transition-all duration-150 cursor-grab hover:cursor-grab active:cursor-grabbing"
                {...dragListeners}
                {...dragAttributes}
            >
                <MdDragIndicator size="1.2rem" />
            </div>
        </div>
    );
};