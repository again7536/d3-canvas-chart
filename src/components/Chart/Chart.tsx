import { useEffect, useRef } from "react";
import { Candle } from "../../types";
import moment from "moment";
import * as d3 from "d3";

const SVG_SIZE = {
  width: 700,
  height: 500,
  left: 80,
  right: 80,
  top: 40,
  bottom: 40,
};

interface ChartProps {
  candles: Candle[];
}

function Chart({ candles }: ChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  // initial draw
  useEffect(() => {
    if (!svgRef.current) return;
    const $svg = d3.select(svgRef.current);

    $svg.attr("width", SVG_SIZE.width).attr("height", SVG_SIZE.height);

    $svg
      .append("g")
      .attr("id", "x-axis")
      .attr("transform", `translate(0, ${SVG_SIZE.height - SVG_SIZE.bottom})`);

    $svg
      .append("g")
      .attr("id", "y-axis")
      .attr("transform", `translate(${SVG_SIZE.left}, 0)`);

    $svg
      .append("clipPath")
      .attr("id", "clip")
      .append("rect")
      .attr("fill", "transparent")
      .attr("x", SVG_SIZE.left)
      .attr("y", SVG_SIZE.top)
      .attr("width", SVG_SIZE.width - SVG_SIZE.left - SVG_SIZE.right)
      .attr("height", SVG_SIZE.height - SVG_SIZE.top - SVG_SIZE.bottom);

    $svg.append("g").attr("id", "chart").attr("clip-path", "url(#clip)");
  }, []);

  // subsequent draw
  useEffect(() => {
    if (!svgRef.current) return;
    const $svg = d3.select(svgRef.current);

    // x-axis
    const xScale = d3
      .scaleTime()
      .domain([
        d3.timeMinute.offset(
          moment(candles[0]?.candle_date_time_kst ?? new Date()).toDate(),
          -1
        ),
        d3.timeMinute.offset(
          moment(
            candles[candles.length - 1]?.candle_date_time_kst ?? new Date()
          ).toDate(),
          1
        ),
      ])
      .range([SVG_SIZE.left, SVG_SIZE.width - SVG_SIZE.right]);
    const xAxis = d3.axisBottom(xScale);
    const xTicks = xScale.ticks(d3.timeMinute.every(1) as d3.TimeInterval);
    const width = xTicks[1]
      ? xScale(xTicks[1]) - xScale(xTicks[0])
      : SVG_SIZE.width - SVG_SIZE.left - SVG_SIZE.right;

    // y-axis
    const yScale = d3
      .scaleLinear()
      .domain([
        d3.min(candles, (candle) => candle.trade_price) ?? 0,
        d3.max(candles, (candle) => candle.trade_price) ?? 0,
      ])
      .range([SVG_SIZE.height - SVG_SIZE.bottom, SVG_SIZE.top]);
    const yAxis = d3.axisLeft(yScale);

    $svg.select<SVGGElement>("#x-axis").call(xAxis);
    $svg.select<SVGGElement>("#y-axis").call(yAxis);

    // utils
    const getColor = (d: Candle) =>
      d.opening_price <= d.trade_price ? "#c84a31" : "#1261c4";

    // lines
    $svg
      .select("#chart")
      .selectAll(".tail")
      .data(candles)
      .join(
        ($enter) =>
          $enter
            .append("line")
            .attr("class", "tail")
            .attr("y1", (d) => yScale(d.high_price))
            .attr("y2", (d) => yScale(d.low_price))
            .attr("x1", 0)
            .attr("x2", 0)
            .attr(
              "transform",
              (d) => `translate(${xScale(moment(d.candle_date_time_kst))}, 0)`
            )
            .style("stroke", (d) => getColor(d)),
        ($update) =>
          $update
            .attr("y1", (d) => yScale(d.high_price))
            .attr("y2", (d) => yScale(d.low_price))
            .attr("x1", 0)
            .attr("x2", 0)
            .attr(
              "transform",
              (d) => `translate(${xScale(moment(d.candle_date_time_kst))}, 0)`
            )
            .style("stroke", (d) => getColor(d)),
        ($exit) => $exit.remove()
      );

    //opening line
    $svg
      .select("#chart")
      .selectAll(".base")
      .data(candles)
      .join(
        ($enter) =>
          $enter
            .append("line")
            .attr("class", "base")
            .attr("x1", -width / 2)
            .attr("x2", width / 2)
            .attr(
              "transform",
              (d) =>
                `translate(${xScale(moment(d.candle_date_time_kst))},
                  ${yScale(d.opening_price)}
                )`
            )
            .style("stroke", (d) => getColor(d)),
        ($update) =>
          $update
            .attr("x1", -width / 2)
            .attr("x2", width / 2)
            .attr(
              "transform",
              (d) =>
                `translate(${xScale(moment(d.candle_date_time_kst))},
                  ${yScale(d.opening_price)}
                )`
            )
            .style("stroke", (d) => getColor(d)),
        ($exit) => $exit.remove()
      );

    // rects
    $svg
      .select("#chart")
      .selectAll("rect")
      .data(candles)
      .join(
        ($enter) =>
          $enter
            .append("rect")
            .attr(
              "height",
              (d) =>
                yScale(Math.min(d.opening_price, d.trade_price)) -
                yScale(Math.max(d.opening_price, d.trade_price))
            )
            .attr("width", width)
            .attr(
              "transform",
              (d) =>
                `translate(${
                  xScale(moment(d.candle_date_time_kst)) - width / 2
                }, ${yScale(Math.max(d.opening_price, d.trade_price))})`
            )
            .style("fill", (d) => getColor(d)),
        ($update) =>
          $update
            .attr(
              "height",
              (d) =>
                yScale(Math.min(d.opening_price, d.trade_price)) -
                yScale(Math.max(d.opening_price, d.trade_price))
            )
            .attr("width", width)
            .attr(
              "transform",
              (d) =>
                `translate(${
                  xScale(moment(d.candle_date_time_kst)) - width / 2
                }, ${yScale(Math.max(d.opening_price, d.trade_price))})`
            )
            .style("fill", (d) => getColor(d)),
        ($exit) => $exit.remove()
      );
  }, [candles]);

  return <svg ref={svgRef} />;
}

export default Chart;
