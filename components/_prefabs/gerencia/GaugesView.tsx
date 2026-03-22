import { MdOutlinePropaneTank } from "react-icons/md";
import { TbMoneybag } from "react-icons/tb";

interface GaugesViewProps {
	branch: any;
}

export default function GaugesView({ branch }: GaugesViewProps) {
	if (!branch || branch.branchType !== "SUCURSAL") {
		return null;
	}

	return (
		<div className="absolute flex bottom-4 right-4 bg-green-50 shadow-md rounded-md p-4">
			<div className="flex text-green-700">
				<TbMoneybag size="2.1em" className="mr-2 mt-2" />
				<div>
					<p className="text-sm mt-1">VENDIDOS</p>
					<div className="flex flex-nowrap text-xl">
						<span><b>{branch.gasReports?.[0]?.currentMonth ?? 0}</b>&nbsp;</span>
						<span>m<sup>3</sup></span>
					</div>
				</div>
			</div>
			<p className="text-md ml-3 text-slate-700 text-center w-full mt-4 mx-4">
				<b>vs</b>
			</p>
			<div className="flex text-blue-700">
				<MdOutlinePropaneTank size="2.1em" className="mr-2 mt-2" />
				<div>
					<p className="text-sm mt-1">ENVASADOS</p>
					<div className="flex flex-nowrap text-xl">
						<span><b>{branch.gasReports?.[0]?.currentMonthPackaged ?? 0}</b>&nbsp;</span>
						<span>m<sup>3</sup></span>
					</div>
				</div>
			</div>
		</div>
	);
}
