
import { motion } from "framer-motion"
import * as d3 from "d3"
import dayjs from "dayjs";
import { COLORS_PALETTE } from "@/app/utils/colorsPalette"

export function LineChart({ data, width, height }) {
    let margin = { t: 20, r: 20, b: 40, l: 40 }
    let xScale = d3.scaleTime()
      .domain([data[0].date, data.at(-1).date])
      .range([margin.l, width - margin.r]);
  
    let yScale = d3.scaleLinear()
      .domain([0, 1500000])
      .range([height - margin.b, margin.t]);
  
    let line = d3.line()
      .x(d => xScale(d.date))
      .y(d => yScale(d.value));
    let d = line(data);
    return (
      <>
        <svg viewBox={`0 0 ${width} ${height}`}>
          {yScale.ticks(5).map(max =>
            <g key={max} className="text-gray-400"
              transform={`translate(0, ${yScale(max)})`}>
              <line
                x1={margin.l}
                x2={width - margin.r}
                stroke="currentColor"
                strokeWidth={.5}
                strokeDasharray={5}
              />
              <text className="text-sm" fill="currentColor"
                alignmentBaseline="middle">{(max / 1000000) + "M"}</text>
            </g>
          )}
  
          {xScale.ticks(6).map(date =>
            <g className="text-gray-400" key={date.toISOString()}
              transform={`translate(${xScale(date)}, ${height - 20})`}>
              <text className="text-sm" fill="currentColor"
                textAnchor="middle"
                alignmentBaseline="middle">{dayjs(date).format("MMM")}</text>
            </g>
          )}
  
          <motion.path
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.4, delay: 0.5, type: "spring" }}
            d={d} fill="none" stroke={COLORS_PALETTE[0]} strokeWidth={4} />
  
          {data.map((d, i) =>
            <motion.circle
              key={d.date}
              initial={{ cy: height - margin.b }}
              animate={{ cy: yScale(d.value) }}
              transition={{ type: "spring", duration: 0.4, delay: 0.1 * i }}
              r="5"
              cx={xScale(d.date)}
              cy={yScale(d.value)}
              fill={COLORS_PALETTE[0]}
              strokeWidth={2}
              stroke="white" />)}
        </svg>
      </>
    )
  }