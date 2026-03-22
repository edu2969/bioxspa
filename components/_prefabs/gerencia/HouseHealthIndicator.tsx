import { TIPO_DEPENDENCIA } from "@/app/utils/constants";
import BarChart from "@/components/charts/BarChart";
import GaugesView from "@/components/_prefabs/gerencia/GaugesView";
import RentabilityIndicator from "@/components/_prefabs/gerencia/RentabilityIndicator";
import { CiBellOn } from "react-icons/ci";
import { FaWhatsappSquare } from "react-icons/fa";
import { IoSettingsSharp } from "react-icons/io5";
import { RiHomeOfficeFill } from "react-icons/ri";

interface HouseHealthIndicatorProps {
	branch: any;
	index: number;
	branchSelected: number | null;
	stateColors: string[];
	getBoxStyles: (index: number) => { width: string; height: string; transform: string };
	onDebtClick: () => void;
	onBranchClick: (index: number) => void;
	onToggleNotifications: () => void;
	onToggleMessages: () => void;
}

export default function HouseHealthIndicator({
	branch,
	index,
	branchSelected,
	stateColors,
	getBoxStyles,
	onDebtClick,
	onBranchClick,
	onToggleNotifications,
	onToggleMessages,
}: HouseHealthIndicatorProps) {
	return (
		<div
			key={index}
			className="absolute w-full h-screen transition-all duration-500"
			style={getBoxStyles(index)}
		>
			<div className="relative w-full h-full bg-white rounded-lg p-4">
				<RiHomeOfficeFill className="relative ml-4 -top-0.5" size="14.1rem" />

				<div className="absolute top-12 left-20 w-8 h-40 flex flex-col justify-end">
					{Array.from({ length: 7 }).map((_, i) => (
						<div
							key={`segmento_${index}_${i}`}
							className={`w-full h-3 mb-1 ${i < (7 - branch.estado) ? "bg-white" : stateColors[branch.estado + 1]} ${i === 6 ? "rounded-bl-md" : ""}`}
						/>
					))}
				</div>

				<RentabilityIndicator rentabilidad={branch.rentabilidad} />

				{branch.tipo == TIPO_DEPENDENCIA.sucursal && (
					<div className="absolute flex top-16 left-72 font-bold">
						<div className="text-green-600 mr-6">
							<div className="flex orbitron">
								<span className="text-2xl">{branch.despachadosHoy}</span>
								<span className="text-xs mt-3 ml-2">m<sup>3</sup></span>
							</div>
							<div className="text-xs">DESPACHADOS<br />AL 31/ENE&apos;25</div>
						</div>
						<div className="text-blue-600">
							<div className="text-xl mt-1">
								<span className="orbitron">{branch.despachadosMesAnterior}</span>
								<span className="text-xs mt-3 ml-2">m<sup>3</sup></span>
							</div>
							<div className="text-xs">AL 31/DIC&apos;24</div>
						</div>
						<div className="ml-4 text-blue-600">
							<div className="text-xl mt-1">
								<span className="orbitron">{branch.despachadosMismoMesAnterior}</span>
								<span className="text-xs mt-3 ml-2">m<sup>3</sup></span>
							</div>
							<div className="text-xs">AL 31/ENE&apos;24</div>
						</div>
					</div>
				)}

				{branch.deudaTotal > 0 && (
					<div
						className="absolute bottom-4 left-48 font-bold text-red-600 hover:bg-red-200 hover:shadow-lg cursor-pointer p-4 rounded-md"
						onClick={onDebtClick}
					>
						<div className="flex orbitron">
							<span className="text-xs mt-2 mr-1">CLP $</span>
							<span className="text-xl">{(branch.deudaTotal / 1000000).toFixed(1)}</span>
							<span className="text-xs ml-1 mt-2">M</span>
						</div>
						<div className="text-xs">DEUDA TOTAL</div>
					</div>
				)}

				<div className="absolute top-4 left-56 flex items-center">
					<div className="flex hover:bg-slate-600 hover:text-white rounded-lg px-2 cursor-pointer" onClick={() => onBranchClick(index)}>
						<IoSettingsSharp size="1.5rem" className="text-white mt-1 mr-2" />
						<span className="text-2xl font-bold uppercase">{branch.nombre}</span>
					</div>
					<div className="flex ml-4">
						<div className="relative hover:scale-125 cursor-pointer" onClick={onToggleNotifications}>
							<CiBellOn size="2rem" />
							<div className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
								4
							</div>
						</div>
						<div className="relative ml-2 hover:scale-125 cursor-pointer" onClick={onToggleMessages}>
							<FaWhatsappSquare className="text-green-600" size="2rem" />
							<div className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
								9
							</div>
						</div>
					</div>
				</div>

				{branch.tipo == TIPO_DEPENDENCIA.sucursal && (
					<div className={`absolute bottom-0 right-16 ${branchSelected !== null ? "w-[640px] h-[520px]" : ""}`}>
						<BarChart
							data={branch.topDeudores}
							width={branchSelected !== null ? 640 : 320}
							height={branchSelected !== null ? 520 : 260}
						/>
					</div>
				)}

				<GaugesView branch={branch} />
			</div>
		</div>
	);
}
