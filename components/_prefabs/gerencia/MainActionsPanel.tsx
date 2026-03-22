import Link from "next/link";
import { TbReportMoney, TbShoppingBagPlus } from "react-icons/tb";

interface MainActionsPanelProps {
	visible: boolean;
}

export default function MainActionsPanel({ visible }: MainActionsPanelProps) {
	if (!visible) {
		return null;
	}

	return (
		<div className="absolute top-24 left-72 bg-white rounded-md p-4 border border-gray-300">
			<span className="position relative -top-7 text-xs font-bold mb-2 bg-white px-2 text-gray-400">ACCIONES RAPIDAS</span>
			<Link href="/modulos/pedidos/nuevo" className="flex items-center bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">
				<TbShoppingBagPlus size="1.5rem" className="mr-2" />
				NUEVA VENTA
			</Link>
			<Link href="/modulos/cobros" className="flex items-center bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 mt-2">
				<TbReportMoney size="1.5rem" className="mr-2" />
				COBROS
			</Link>
		</div>
	);
}
