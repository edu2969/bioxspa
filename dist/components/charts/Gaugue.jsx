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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Gauge = Gauge;
const react_1 = require("react");
const d3 = __importStar(require("d3"));
function Gauge({ value, width, height, unit }) {
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
    const needleRef = (0, react_1.useRef)();
    (0, react_1.useEffect)(() => {
        d3.select(needleRef.current)
            .transition()
            .duration(500)
            .attr('transform', `rotate(${needleAngle * 180 / Math.PI})`);
    }, [needleRef, needleAngle]);
    return (<svg width={width} height={height}>
            <g transform={`translate(${width / 2}, ${height / 2})`}>
                <path d={arc({ startAngle: -100 * Math.PI / 180, endAngle: -20 * Math.PI / 180 })} fill="#EF4444"/>
                <path d={arc({ startAngle: -20 * Math.PI / 180, endAngle: 60 * Math.PI / 180 })} fill="#1C4ED8"/>
                <path d={arc({ startAngle: 60 * Math.PI / 180, endAngle: 100 * Math.PI / 180 })} fill="#16A34A"/>
                {ticks.map(tick => (<g key={tick} transform={`rotate(${scale(tick) * 180 / Math.PI})`}>
                        <line x1={0} y1={-radius} x2={0} y2={-radius + arcWidth} stroke="white" strokeWidth={2}/>
                        <text x={0} y={-radius + arcWidth + 15} textAnchor="middle" alignmentBaseline="middle" fontSize="10">{tick}</text>
                    </g>))}
                {mediumTicks.map(tick => (<g key={tick} transform={`rotate(${scale(tick) * 180 / Math.PI})`}>
                        <line x1={0} y1={-radius} x2={0} y2={-radius + arcWidth / 2} stroke="white" strokeWidth={1}/>
                    </g>))}
                {smallTicks.map(tick => (<g key={tick} transform={`rotate(${scale(tick) * 180 / Math.PI})`}>
                        <line x1={0} y1={-radius} x2={0} y2={-radius + arcWidth / 4} stroke="white" strokeWidth={0.5}/>
                    </g>))}
                <g ref={needleRef}>
                    <path d={`M 0 ${-needleLength} L ${needleRadius} 0 L ${-needleRadius} 0 Z`} fill="black"/>
                    <circle cx={0} cy={0} r={needleRadius} fill="black"/>
                </g>
                <text x={0} y={radius / 2} textAnchor="middle" alignmentBaseline="middle" fontSize="14">{value} {unit}</text>
            </g>
        </svg>);
}
exports.default = Gauge;
