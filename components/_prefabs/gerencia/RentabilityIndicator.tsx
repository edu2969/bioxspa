interface RentabilityIndicatorProps {
	rentabilidad: number;
}

export default function RentabilityIndicator({ rentabilidad }: RentabilityIndicatorProps) {
	return (
		<div className="absolute bottom-8 text-center left-12 text-4xl font-bold orbitron">
			{rentabilidad}%
			<div className="text-xs">RENTABILIDAD</div>
		</div>
	);
}
