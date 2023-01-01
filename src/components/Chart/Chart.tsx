import { useMemo, useEffect, useRef, useState } from "react";
import { Candle } from "../../types";
import moment from "moment";
import * as d3 from "d3";
import { throttle } from "lodash";

const CANVAS_SIZE = {
  width: 700,
  height: 500,
  left: 80,
  right: 80,
  top: 40,
  bottom: 40,
};

const TICK_SIZE = 6;
const TICK_PADDING = 3;
const TICK_COUNT_X = 5;
const TICK_COUNT_Y = 8;

interface ChartProps {
  candles: Map<string, Candle>;
  onLeft: () => void;
  time: { start: string; end: string };
}

// utils
const getColor = (d: Candle) =>
  d.opening_price <= d.trade_price ? "#c84a31" : "#1261c4";

const initXScale = () => {
  return d3
    .scaleTime()
    .domain([
      moment(moment.now()).subtract(12, "minutes").toDate(),
      moment(moment.now()).add(6, "minutes").toDate(),
    ])
    .range([CANVAS_SIZE.left, CANVAS_SIZE.width - CANVAS_SIZE.right]);
};

const drawXaxis = (
  context: CanvasRenderingContext2D,
  xScale: d3.ScaleTime<number, number, never>,
  Y: number,
  xExtent: [number, number]
) => {
  const [startX, endX] = xExtent;
  const xTicks = xScale.ticks(TICK_COUNT_X), // You may choose tick counts. ex: xScale.ticks(20)
    xTickFormat = xScale.tickFormat(); // you may choose the format. ex: xScale.tickFormat(tickCount, ".0s")

  context.strokeStyle = "black";

  context.beginPath();
  xTicks.forEach((d) => {
    context.moveTo(xScale(d), Y);
    context.lineTo(xScale(d), Y + TICK_SIZE);
  });
  context.stroke();

  context.beginPath();
  context.moveTo(startX, Y + TICK_SIZE);
  context.lineTo(startX, Y);
  context.lineTo(endX, Y);
  context.lineTo(endX, Y + TICK_SIZE);
  context.stroke();

  context.textAlign = "center";
  context.textBaseline = "top";
  context.fillStyle = "black";
  xTicks.forEach((d) => {
    context.beginPath();
    context.fillText(xTickFormat(d), xScale(d), Y + TICK_SIZE);
  });
};

const drawYaxis = (
  context: CanvasRenderingContext2D,
  yScale: d3.ScaleLinear<number, number, never>,
  X: number,
  yExtent: [number, number]
) => {
  const [startY, endY] = yExtent;

  const yTicks = yScale.ticks(TICK_COUNT_Y),
    yTickFormat = yScale.tickFormat();

  context.strokeStyle = "black";
  context.beginPath();
  yTicks.forEach((d) => {
    context.moveTo(X, yScale(d));
    context.lineTo(X - TICK_SIZE, yScale(d));
  });
  context.stroke();

  context.beginPath();
  context.moveTo(X - TICK_SIZE, startY);
  context.lineTo(X, startY);
  context.lineTo(X, endY);
  context.lineTo(X - TICK_SIZE, endY);
  context.stroke();

  context.textAlign = "right";
  context.textBaseline = "middle";
  context.fillStyle = "black";
  yTicks.forEach((d) => {
    context.beginPath();
    context.fillText(yTickFormat(d), X - TICK_SIZE - TICK_PADDING, yScale(d));
  });
};

const drawTail = (
  context: CanvasRenderingContext2D,
  candles: Map<string, Candle>,
  xScale: d3.ScaleTime<number, number, never>,
  yScale: d3.ScaleLinear<number, number, never>
) => {
  [...candles.values()]
    .filter((d) => {
      const x = xScale(Date.parse(d.candle_date_time_kst));
      return !(
        x < CANVAS_SIZE.left || x > CANVAS_SIZE.width - CANVAS_SIZE.right
      );
    })
    .forEach((d) => {
      context.beginPath();
      context.strokeStyle = getColor(d);
      context.moveTo(
        xScale(Date.parse(d.candle_date_time_kst)),
        yScale(d.high_price)
      );
      context.lineTo(
        xScale(Date.parse(d.candle_date_time_kst)),
        yScale(d.low_price)
      );
      context.stroke();
    });
};

const drawBar = (
  context: CanvasRenderingContext2D,
  candles: Map<string, Candle>,
  xScale: d3.ScaleTime<number, number, never>,
  yScale: d3.ScaleLinear<number, number, never>,
  width: number
) => {
  [...candles.values()]
    .filter((d) => {
      const x1 = xScale(Date.parse(d.candle_date_time_kst)) - width / 2;
      const x2 = xScale(Date.parse(d.candle_date_time_kst)) + width / 2;
      return !(
        x2 < CANVAS_SIZE.left || x1 > CANVAS_SIZE.width - CANVAS_SIZE.right
      );
    })
    .forEach((d) => {
      context.beginPath();
      context.fillStyle = getColor(d);
      context.fillRect(
        xScale(Date.parse(d.candle_date_time_kst)) - width / 2,
        yScale(Math.max(d.opening_price, d.trade_price)),
        width,
        yScale(Math.min(d.opening_price, d.trade_price)) -
          yScale(Math.max(d.opening_price, d.trade_price))
      );
      context.stroke();
    });
};

const drawBase = (
  context: CanvasRenderingContext2D,
  candles: Map<string, Candle>,
  xScale: d3.ScaleTime<number, number, never>,
  yScale: d3.ScaleLinear<number, number, never>,
  width: number
) => {
  [...candles.values()]
    .filter((d) => {
      const x1 = xScale(Date.parse(d.candle_date_time_kst)) - width / 2;
      const x2 = xScale(Date.parse(d.candle_date_time_kst)) + width / 2;
      return !(
        x2 < CANVAS_SIZE.left || x1 > CANVAS_SIZE.width - CANVAS_SIZE.right
      );
    })
    .forEach((d) => {
      context.beginPath();
      context.strokeStyle = getColor(d);
      context.moveTo(
        xScale(Date.parse(d.candle_date_time_kst)) - width / 2,
        yScale(d.opening_price)
      );
      context.lineTo(
        xScale(Date.parse(d.candle_date_time_kst)) + width / 2,
        yScale(d.opening_price)
      );
      context.stroke();
    });
};

const startClip = (context: CanvasRenderingContext2D) => {
  context.save();
  context.beginPath();
  context.rect(
    CANVAS_SIZE.left,
    CANVAS_SIZE.top,
    CANVAS_SIZE.width - CANVAS_SIZE.right - CANVAS_SIZE.left,
    CANVAS_SIZE.height - CANVAS_SIZE.bottom - CANVAS_SIZE.top
  );
  context.clip();
};

const stopClip = (context: CanvasRenderingContext2D) => context.restore();

/*
 * Component
 */
function Chart({ candles, onLeft, time }: ChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [xScale, setXScale] = useState<d3.ScaleTime<number, number, never>>(
    () => initXScale()
  );

  const handleLeft = useMemo(() => throttle(onLeft, 300), [onLeft]);

  // initial draw
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = d3.select(canvasRef.current);

    canvas.attr("width", CANVAS_SIZE.width).attr("height", CANVAS_SIZE.height);
  }, []);

  // subsequent draw
  useEffect(() => {
    if (!canvasRef.current || !xScale) return;
    const canvas = d3.select(canvasRef.current);
    const context = canvas.node()?.getContext("2d");
    if (!context) return;

    // x-axis
    const xTicks = xScale.ticks(d3.timeMinute.every(1) as d3.TimeInterval);
    const width = xTicks[1]
      ? xScale(xTicks[1]) - xScale(xTicks[0])
      : CANVAS_SIZE.width - CANVAS_SIZE.left - CANVAS_SIZE.right;

    // y-axis
    const yScale = d3
      .scaleLinear()
      .domain([
        d3.min(candles, (candle) => candle[1].trade_price) ?? 0,
        d3.max(candles, (candle) => candle[1].trade_price) ?? 0,
      ])
      .range([CANVAS_SIZE.height - CANVAS_SIZE.bottom, CANVAS_SIZE.top]);

    drawXaxis(context, xScale, CANVAS_SIZE.height - CANVAS_SIZE.bottom, [
      CANVAS_SIZE.left,
      CANVAS_SIZE.width - CANVAS_SIZE.right,
    ]);

    drawYaxis(context, yScale, CANVAS_SIZE.left, [
      CANVAS_SIZE.top,
      CANVAS_SIZE.height - CANVAS_SIZE.bottom,
    ]);

    startClip(context);
    drawTail(context, candles, xScale, yScale);
    drawBar(context, candles, xScale, yScale, width);
    drawBase(context, candles, xScale, yScale, width);
    stopClip(context);

    // zoom
    canvas.call(
      d3
        .zoom<HTMLCanvasElement, unknown>()
        .scaleExtent([0.025, 4])
        .on("zoom", (e: d3.D3ZoomEvent<HTMLCanvasElement, unknown>) => {
          const xRescale = e.transform.rescaleX(initXScale());

          context.save();
          context.translate(e.transform.x, e.transform.y);
          context.scale(e.transform.k, e.transform.k);
          context.restore();

          if (
            xRescale(moment(time.start).subtract(1, "minutes")) >
            CANVAS_SIZE.left
          )
            handleLeft();

          setXScale(() => e.transform.rescaleX(initXScale()));
        })
    );

    canvas.on("mouseover", (e: MouseEvent) => {
      xScale.invert(e.offsetX);
    });
    return () => {
      context.clearRect(0, 0, CANVAS_SIZE.width, CANVAS_SIZE.height);
    };
  }, [candles, handleLeft, xScale, time]);

  return <canvas ref={canvasRef} />;
}

export default Chart;
