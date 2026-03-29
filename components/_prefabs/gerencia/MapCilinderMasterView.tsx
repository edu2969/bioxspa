import MapaCilindros from "@/components/maps/MapaCilindros";
import { GoogleMapsProvider } from "@/components/maps/GoogleMapProvider";

interface Categoria {
	id?: string;
	_id?: string;
	elemento?: string;
}

interface MapCilinderMasterViewProps {
	visible: boolean;
	mapData: any[];
	categorias: Categoria[];
	selectedCategoryIds: string[];
	onToggleCategory: (categoryId: string) => void;
	propios: boolean;
	onTogglePropios: () => void;
	llenos: boolean;
	onToggleLlenos: () => void;
}

export default function MapCilinderMasterView({
	visible,
	mapData,
	categorias,
	selectedCategoryIds,
	onToggleCategory,
	propios,
	onTogglePropios,
	llenos,
	onToggleLlenos,
}: MapCilinderMasterViewProps) {
	return (
		<div className={`w-full h-full bg-white ${visible ? "" : "hidden"}`}>
			<div className="flex flex-col">
				<div className="w-full h-96">
					<GoogleMapsProvider>
						<MapaCilindros key={`mapa_${new Date()}`} data={mapData} />
					</GoogleMapsProvider>
				</div>
				

				<div className="flex flex-col">
					<div className="relative rounded-md px-2 pt-2 pb-0 border border-gray-300 mt-4">
						<span className="position absolute text-xs font-bold mb-2 -mt-4 bg-white px-2 text-gray-400">TIPOS DE GASES</span>
						{categorias?.map((categoria, i) => {
							const categoriaId = String(categoria.id || categoria._id || "");
							const isActive = selectedCategoryIds.includes(categoriaId);

							return (
								<button
									key={`chip_${categoriaId || i}_${i}`}
									className={`${isActive ? "text-white" : "bg-gray-200 text-gray-800"} hover:bg-gray-300 font-bold py-0 mr-1 px-4 rounded-md mb-2`}
									onClick={() => {
										if (!categoriaId) return;
										onToggleCategory(categoriaId);
									}}
								>
									{categoria.elemento}
								</button>
							);
						})}
					</div>

					<div className="relative bg-transparent rounded-md px-2 pt-4 pb-2 border border-gray-300 mt-4">
						<span className="position absolute text-xs font-bold mb-2 -mt-6 bg-white px-2 text-gray-400">DUEÑO / ESTADO</span>
						<div className="flex">
							<div className="flex items-center space-x-2 ml-6 mr-10">
								<span className="text-lg font-semibold">Clientes</span>
								<label className="relative inline-flex items-center cursor-pointer w-12">
									<input
										type="checkbox"
										checked={propios}
										onChange={onTogglePropios}
										className="sr-only peer"
									/>
									<div
										className={`
								w-12 h-6 rounded-full transition-colors
								${propios ? "bg-blue-600" : "bg-gray-200"}
							`}
									></div>
									<span
										className={`
								absolute top-1 w-4 h-4 bg-white rounded-full transition-transform
								${propios ? "translate-x-6 left-1" : "translate-x-0 left-1"}
							`}
										style={{ transition: "transform 0.2s" }}
									></span>
								</label>
								<span className="text-lg font-semibold">BIOX</span>
							</div>
							<div className="flex items-center space-x-2 ml-6">
								<span className="text-lg font-semibold">Vacío</span>
								<label className="relative inline-flex items-center cursor-pointer w-12">
									<input
										type="checkbox"
										checked={llenos}
										onChange={onToggleLlenos}
										className="sr-only peer"
									/>
									<div
										className={`
								w-12 h-6 rounded-full transition-colors
								${llenos ? "bg-blue-600" : "bg-gray-200"}
							`}
									></div>
									<span
										className={`
								absolute top-1 w-4 h-4 bg-white rounded-full transition-transform
								${llenos ? "translate-x-6 left-1" : "translate-x-0 left-1"}
							`}
										style={{ transition: "transform 0.2s" }}
									></span>
								</label>
								<span className="text-lg font-semibold">Lleno</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
