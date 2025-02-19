import React from 'react';
import { scaleBand, scaleLinear } from 'd3-scale';
import { motion } from 'framer-motion';
import { COLORS_PALETTE } from "@/app/utils/colorsPalette";

export function BarChart({ data, width, height, indexColor }) {
    let margin = { t: 20, r: 20, b: 40, l: 10 }; // Aumenta el margen izquierdo
    const xScale = scaleBand()
        .domain(data.map(d => d.empresa))
        .range([margin.l + 10, width - margin.r])
        .padding(0.1);

    const yScale = scaleLinear()
        .domain([0, Math.max(...data.map(d => d.deuda))])
        .range([height - margin.b, margin.t]);

    const max = Math.max(...data.map(d => d.deuda));

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <g transform={`translate(${margin.l}, ${margin.t - 20})`}>
                {yScale.ticks(3).map(tick =>
                    <g key={tick} className="text-gray-400" transform={`translate(0, ${yScale(tick)})`}>
                        <line
                            x1={30}
                            x2={width - margin.l - margin.r + 30}
                            stroke="#ED4546"
                            strokeWidth={.5}
                            strokeDasharray={5}
                        />
                        <text className="text-xs" fill="currentColor" alignmentBaseline="middle">
                            {(tick / 1000000).toFixed(1) + "M"}
                        </text>
                    </g>
                )}
            </g>

            {data.map((d, i) => (
                <g key={d.empresa} transform={`translate(${xScale(d.empresa) + 24}, 0)`}>
                    <motion.rect
                        initial={{ height: 0, y: yScale(0) }}
                        animate={{ height: Math.max(0, yScale(0) - yScale(d.deuda)), y: yScale(d.deuda) }}
                        transition={{ type: "spring", duration: 0.4, delay: 0.1 * i }}
                        x={0} 
                        width={xScale.bandwidth()}                         
                        fill={'#ED4546'}
                    />
                    <text
                        className="text-xs uppercase"
                        fill="white"
                        textAnchor="start"
                        alignmentBaseline="middle"
                        transform={`translate(${xScale.bandwidth() - 10}, ${yScale(d.deuda) + 5}) rotate(90)`}>
                        {d.empresa}
                    </text>
                </g>
            ))}
        </svg>
    );
}

export default BarChart;