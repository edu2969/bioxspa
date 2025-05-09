"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MultiLineChart;
const framer_motion_1 = require("framer-motion");
const d3 = __importStar(require("d3"));
const dayjs_1 = __importDefault(require("dayjs"));
const colorsPalette_1 = require("@/app/utils/colorsPalette");
function MultiLineChart({ data, width, height, colorIndexes = [1, 2], simple = false }) {
    let margin = { t: 20, r: 20, b: 40, l: 40 };
    let xScale = d3.scaleTime()
        .domain([data[0].points[0].date, data[0].points.at(-1).date])
        .range([margin.l, width - margin.r]);
    let yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d3.max(d.points, p => p.value))])
        .range([height - margin.b, margin.t]);
    let line = d3.line()
        .x(d => xScale(d.date))
        .y(d => yScale(d.value));
    let d = data.map(kv => line(kv.points));
    let lineaLeyenda = d3.line()
        .x(d => d[0])
        .y(d => d[1]);
    let leyendas = [[[width / 2 - 6, 4], [width / 2 + 6, 4]],
        [[width / 2 - 6, 22], [width / 2 + 6, 22]], [[width / 2 - 6, 40], [width / 2 + 6, 40]],].map(l => {
        return lineaLeyenda(l);
    });
    return (<>
            <svg viewBox={`0 0 ${width} ${height}`}>
                {!simple && yScale.ticks(2).map(max => <g key={max} className="text-gray-400" transform={`translate(0, ${yScale(max)})`}>
                        <line x1={margin.l} x2={width - margin.r} stroke="currentColor" strokeWidth={.5} strokeDasharray={5}/>
                        <text className="text-sm" fill="currentColor" alignmentBaseline="middle">{(max / 1000000) + "M"}</text>
                    </g>)}

                {!simple && xScale.ticks(6).map(date => <g className="text-gray-400" key={date.toISOString()} transform={`translate(${xScale(date)}, ${height - 20})`}>
                        <text className="text-sm" fill="currentColor" textAnchor="middle" alignmentBaseline="middle">{(0, dayjs_1.default)(date).format("MMM")}</text>
                    </g>)}

                {data.map((kv, index) => <framer_motion_1.motion.path key={"p_" + kv.category + "_" + d.date} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, delay: 0.5, type: "spring" }} d={d[index]} fill="none" stroke={colorsPalette_1.COLORS_PALETTE[colorIndexes[index]]} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round"/>)}

                {!simple && data.map((kv, index) => kv.points.map((d, i) => <framer_motion_1.motion.circle key={"c_" + kv.category + "_" + d.date} initial={{ cy: height - margin.b }} animate={{ cy: yScale(d.value) }} transition={{ type: "spring", duration: 0.4, delay: 0.1 * i }} r="5" cx={xScale(d.date)} cy={yScale(d.value)} fill={colorsPalette_1.COLORS_PALETTE[colorIndexes[index]]} strokeWidth={2} stroke="white"/>))}

                {!simple && data.map((kv, index) => <path key={`leyenda_${kv.category}`} d={leyendas[index]} fill="none" stroke={colorsPalette_1.COLORS_PALETTE[colorIndexes[index]]} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round"/>)}

                {!simple && data.map((kv, index) => <g key={`label_${kv.category}`} transform={`translate(${width / 2 + 16}, ${10 + index * 18})`}>
                        <text className="text-sm" fill={colorsPalette_1.COLORS_PALETTE[colorIndexes[index]]}>{kv.category}</text>
                    </g>)}
            </svg>
        </>);
}
