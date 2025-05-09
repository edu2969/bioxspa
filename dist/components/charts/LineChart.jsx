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
exports.LineChart = LineChart;
const framer_motion_1 = require("framer-motion");
const d3 = __importStar(require("d3"));
const dayjs_1 = __importDefault(require("dayjs"));
const colorsPalette_1 = require("@/app/utils/colorsPalette");
function LineChart({ data, width, height, indexColor = 0 }) {
    let margin = { t: 20, r: 20, b: 40, l: 40 };
    let xScale = d3.scaleTime()
        .domain([data[0].date, data.at(-1).date])
        .range([margin.l, width - margin.r]);
    let yScale = d3.scaleLinear()
        .domain([0, 1500000])
        .range([height - margin.b - 60, margin.t]);
    let line = d3.line()
        .x(d => xScale(d.date))
        .y(d => yScale(d.value));
    let d = line(data);
    return (<>
        <svg viewBox={`0 0 ${width} ${height}`}>
          {yScale.ticks(3).map(max => <g key={max} className="text-gray-400" transform={`translate(0, ${yScale(max)})`}>
              <line x1={margin.l} x2={width - margin.r} stroke="currentColor" strokeWidth={.5} strokeDasharray={5}/>
              <text className="text-xs" fill="currentColor" alignmentBaseline="middle">{(max / 1000000) + "M"}</text>
            </g>)}
  
          {xScale.ticks(6).map(date => <g className="text-gray-400" key={date.toISOString()} transform={`translate(${xScale(date)}, ${height - 80})`}>
              <text className="text-xs uppercase" fill="currentColor" textAnchor="middle" alignmentBaseline="middle">{(0, dayjs_1.default)(date).format("MMM")}</text>
            </g>)}
  
          <framer_motion_1.motion.path initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, delay: 0.5, type: "spring" }} d={d} fill="none" stroke={colorsPalette_1.COLORS_PALETTE[indexColor]} strokeWidth={4}/>
  
          {data.map((d, i) => <framer_motion_1.motion.circle key={d.date} initial={{ cy: height - margin.b }} animate={{ cy: yScale(d.value) }} transition={{ type: "spring", duration: 0.4, delay: 0.1 * i }} r="5" cx={xScale(d.date)} cy={yScale(d.value)} fill={colorsPalette_1.COLORS_PALETTE[indexColor]} strokeWidth={2} stroke="white"/>)}
        </svg>
      </>);
}
