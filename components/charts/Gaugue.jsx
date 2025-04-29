import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export function Gauge({ value, width, height, unit }) {
    const margin = { t: 20, r: 20, b: 40, l: 40 };
    const radius = Math.min(width, height) / 2 - margin.t;
    const arcWidth = 14;
    const needleLength = radius - arcWidth;
    const needleRadius = 5;

    const arc = d3.arc()
        .innerRadius(radius - arcWidth)
        .outerRadius(radius)
        .startAngle(d => d.startAngle)
        .endAngle(d => d.endAngle);

    const ticks = d3.range(0, 101, 20);
    const smallTicks = d3.range(0, 101, 2);
    const mediumTicks = d3.range(0, 101, 10);

    const scale = d3.scaleLinear()
        .domain([0, 100])
        .range([-100 * Math.PI / 180, 100 * Math.PI / 180]);

    const needleAngle = scale(value);

    const needleRef = useRef();

    useEffect(() => {
        d3.select(needleRef.current)
            .transition()
            .duration(500)
            .attr('transform', `rotate(${needleAngle * 180 / Math.PI})`);
    }, [needleRef, needleAngle]);

    return (
        <svg width={width} height={height}>
            <g transform={`translate(${width / 2}, ${height / 2})`}>
                <path d={arc({ startAngle: -100 * Math.PI / 180, endAngle: -20 * Math.PI / 180 })} fill="#EF4444" />
                <path d={arc({ startAngle: -20 * Math.PI / 180, endAngle: 60 * Math.PI / 180 })} fill="#1C4ED8" />
                <path d={arc({ startAngle: 60 * Math.PI / 180, endAngle: 100 * Math.PI / 180 })} fill="#16A34A" />
                {ticks.map(tick => (
                    <g key={tick} transform={`rotate(${scale(tick) * 180 / Math.PI})`}>
                        <line x1={0} y1={-radius} x2={0} y2={-radius + arcWidth} stroke="white" strokeWidth={2} />
                        <text x={0} y={-radius + arcWidth + 15} textAnchor="middle" alignmentBaseline="middle" fontSize="10">{tick}</text>
                    </g>
                ))}
                {mediumTicks.map(tick => (
                    <g key={tick} transform={`rotate(${scale(tick) * 180 / Math.PI})`}>
                        <line x1={0} y1={-radius} x2={0} y2={-radius + arcWidth / 2} stroke="white" strokeWidth={1} />
                    </g>
                ))}
                {smallTicks.map(tick => (
                    <g key={tick} transform={`rotate(${scale(tick) * 180 / Math.PI})`}>
                        <line x1={0} y1={-radius} x2={0} y2={-radius + arcWidth / 4} stroke="white" strokeWidth={0.5} />
                    </g>
                ))}
                <g ref={needleRef}>
                    <path d={`M 0 ${-needleLength} L ${needleRadius} 0 L ${-needleRadius} 0 Z`} fill="black" />
                    <circle cx={0} cy={0} r={needleRadius} fill="black" />
                </g>
                <text x={0} y={radius / 2} textAnchor="middle" alignmentBaseline="middle" fontSize="14">{value} {unit}</text>
            </g>
        </svg>
    );
}

export default Gauge;