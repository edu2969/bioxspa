"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BarChart = BarChart;
const react_1 = __importDefault(require("react"));
const d3_scale_1 = require("d3-scale");
const framer_motion_1 = require("framer-motion");
function BarChart({ data, width, height }) {
    let margin = { t: 20, r: 20, b: 40, l: 10 }; // Aumenta el margen izquierdo
    const xScale = (0, d3_scale_1.scaleBand)()
        .domain(data.map(d => d.empresa))
        .range([margin.l + 10, width - margin.r])
        .padding(0.1);
    const yScale = (0, d3_scale_1.scaleLinear)()
        .domain([0, Math.max(...data.map(d => d.deuda))])
        .range([height - margin.b, margin.t]);
    return (<svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <g transform={`translate(${margin.l}, ${margin.t - 20})`}>
                {yScale.ticks(3).map(tick => <g key={tick} className="text-gray-400" transform={`translate(0, ${yScale(tick)})`}>
                        <line x1={30} x2={width - margin.l - margin.r + 30} stroke="#ED4546" strokeWidth={.5} strokeDasharray={5}/>
                        <text className="text-xs" fill="currentColor" alignmentBaseline="middle">
                            {(tick / 1000000).toFixed(1) + "M"}
                        </text>
                    </g>)}
            </g>

            {data.map((d, i) => (<g key={d.empresa} transform={`translate(${xScale(d.empresa) + 24}, 0)`}>
                    <framer_motion_1.motion.rect initial={{ height: 0, y: yScale(0) }} animate={{ height: Math.max(0, yScale(0) - yScale(d.deuda)), y: yScale(d.deuda) }} transition={{ type: "spring", duration: 0.4, delay: 0.1 * i }} x={0} width={xScale.bandwidth()} fill={'#ED4546'}/>
                    <text className="text-xs uppercase" fill="white" textAnchor="start" alignmentBaseline="middle" transform={`translate(${xScale.bandwidth() - 10}, ${yScale(d.deuda) + 5}) rotate(90)`}>
                        {d.empresa}
                    </text>
                </g>))}
        </svg>);
}
exports.default = BarChart;
