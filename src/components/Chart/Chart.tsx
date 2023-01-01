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
  ctx: CanvasRenderingContext2D,
  xScale: d3.ScaleTime<number, number, never>,
  Y: number,
  xExtent: [number, number]
) => {
  const [startX, endX] = xExtent;
  const xTicks = xScale.ticks(TICK_COUNT_X), // You may choose tick counts. ex: xScale.ticks(20)
    xTickFormat = xScale.tickFormat(); // you may choose the format. ex: xScale.tickFormat(tickCount, ".0s")

  ctx.strokeStyle = "black";

  ctx.beginPath();
  xTicks.forEach((d) => {
    ctx.moveTo(xScale(d), Y);
    ctx.lineTo(xScale(d), Y + TICK_SIZE);
  });
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(startX, Y + TICK_SIZE);
  ctx.lineTo(startX, Y);
  ctx.lineTo(endX, Y);
  ctx.lineTo(endX, Y + TICK_SIZE);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = "black";
  xTicks.forEach((d) => {
    ctx.beginPath();
    ctx.fillText(xTickFormat(d), xScale(d), Y + TICK_SIZE);
  });
};

const drawYaxis = (
  ctx: CanvasRenderingContext2D,
  yScale: d3.ScaleLinear<number, number, never>,
  X: number,
  yExtent: [number, number]
) => {
  const [startY, endY] = yExtent;

  const yTicks = yScale.ticks(TICK_COUNT_Y),
    yTickFormat = yScale.tickFormat();

  ctx.strokeStyle = "black";
  ctx.beginPath();
  yTicks.forEach((d) => {
    ctx.moveTo(X, yScale(d));
    ctx.lineTo(X - TICK_SIZE, yScale(d));
  });
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(X - TICK_SIZE, startY);
  ctx.lineTo(X, startY);
  ctx.lineTo(X, endY);
  ctx.lineTo(X - TICK_SIZE, endY);
  ctx.stroke();

  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "black";
  yTicks.forEach((d) => {
    ctx.beginPath();
    ctx.fillText(yTickFormat(d), X - TICK_SIZE - TICK_PADDING, yScale(d));
  });
};

const drawTail = (
  ctx: CanvasRenderingContext2D,
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
      ctx.beginPath();
      ctx.strokeStyle = getColor(d);
      ctx.moveTo(
        xScale(Date.parse(d.candle_date_time_kst)),
        yScale(d.high_price)
      );
      ctx.lineTo(
        xScale(Date.parse(d.candle_date_time_kst)),
        yScale(d.low_price)
      );
      ctx.stroke();
    });
};

const drawBar = (
  ctx: CanvasRenderingContext2D,
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
      ctx.beginPath();
      ctx.fillStyle = getColor(d);
      ctx.fillRect(
        xScale(Date.parse(d.candle_date_time_kst)) - width / 2,
        yScale(Math.max(d.opening_price, d.trade_price)),
        width,
        yScale(Math.min(d.opening_price, d.trade_price)) -
          yScale(Math.max(d.opening_price, d.trade_price))
      );
      ctx.stroke();
    });
};

const drawBase = (
  ctx: CanvasRenderingContext2D,
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
      ctx.beginPath();
      ctx.strokeStyle = getColor(d);
      ctx.moveTo(
        xScale(Date.parse(d.candle_date_time_kst)) - width / 2,
        yScale(d.opening_price)
      );
      ctx.lineTo(
        xScale(Date.parse(d.candle_date_time_kst)) + width / 2,
        yScale(d.opening_price)
      );
      ctx.stroke();
    });
};

const startClip = (ctx: CanvasRenderingContext2D) => {
  ctx.save();
  ctx.beginPath();
  ctx.rect(
    CANVAS_SIZE.left,
    CANVAS_SIZE.top,
    CANVAS_SIZE.width - CANVAS_SIZE.right - CANVAS_SIZE.left,
    CANVAS_SIZE.height - CANVAS_SIZE.bottom - CANVAS_SIZE.top
  );
  ctx.clip();
};

const stopClip = (ctx: CanvasRenderingContext2D) => ctx.restore();

/*
 * Component
 */
function Chart({ candles, onLeft, time }: ChartProps) {
  const tooltipCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const screenRef = useRef<HTMLCanvasElement | null>(null);
  const [xScale, setXScale] = useState<d3.ScaleTime<number, number, never>>(
    () => initXScale()
  );

  const handleLeft = useMemo(() => throttle(onLeft, 300), [onLeft]);

  useEffect(() => {
    if (
      !canvasRef.current ||
      !tooltipCanvasRef.current ||
      !screenRef.current ||
      !xScale
    )
      return;
    const screen = d3.select(screenRef.current);
    const canvas = d3.select(canvasRef.current);
    const tooltipCanvas = d3.select(tooltipCanvasRef.current);
    const ctx = canvas.node()?.getContext("2d");
    const tooltipCtx = tooltipCanvas.node()?.getContext("2d");
    if (!ctx || !tooltipCtx) return;

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

    drawXaxis(ctx, xScale, CANVAS_SIZE.height - CANVAS_SIZE.bottom, [
      CANVAS_SIZE.left,
      CANVAS_SIZE.width - CANVAS_SIZE.right,
    ]);

    drawYaxis(ctx, yScale, CANVAS_SIZE.left, [
      CANVAS_SIZE.top,
      CANVAS_SIZE.height - CANVAS_SIZE.bottom,
    ]);

    startClip(ctx);
    drawTail(ctx, candles, xScale, yScale);
    drawBar(ctx, candles, xScale, yScale, width);
    drawBase(ctx, candles, xScale, yScale, width);
    stopClip(ctx);

    // zoom
    screen.call(
      d3
        .zoom<HTMLCanvasElement, unknown>()
        .scaleExtent([0.025, 4])
        .on("zoom", (e: d3.D3ZoomEvent<HTMLCanvasElement, unknown>) => {
          const xRescale = e.transform.rescaleX(initXScale());

          if (
            xRescale(moment(time.start).subtract(1, "minutes")) >
            CANVAS_SIZE.left
          )
            handleLeft();

          setXScale(() => e.transform.rescaleX(initXScale()));
        })
    );

    screen.on("mousemove", (e: MouseEvent) => {
      const snapTime = d3.timeMinute.round(xScale.invert(e.offsetX));
      const snapX = xScale(snapTime);

      tooltipCtx.clearRect(0, 0, CANVAS_SIZE.width, CANVAS_SIZE.height);

      tooltipCtx.save();
      if (
        e.offsetX > CANVAS_SIZE.left &&
        e.offsetX < CANVAS_SIZE.width - CANVAS_SIZE.right
      ) {
        tooltipCtx.fillStyle = "#3c3c3cc0";
        tooltipCtx.beginPath();
        tooltipCtx.fillRect(
          snapX - 70,
          CANVAS_SIZE.height - CANVAS_SIZE.bottom,
          140,
          25
        );

        tooltipCtx.fillStyle = "white";
        tooltipCtx.beginPath();
        tooltipCtx.fillText(
          snapTime.toISOString(),
          snapX - 60,
          CANVAS_SIZE.height - CANVAS_SIZE.bottom + 16
        );

        tooltipCtx.setLineDash([5, 5]);
        tooltipCtx.strokeStyle = "#3c3c3c60";
        tooltipCtx.beginPath();
        tooltipCtx.moveTo(snapX, CANVAS_SIZE.top);
        tooltipCtx.lineTo(snapX, CANVAS_SIZE.height - CANVAS_SIZE.bottom);
        tooltipCtx.stroke();

        tooltipCtx.beginPath();
        tooltipCtx.moveTo(CANVAS_SIZE.left, e.offsetY);
        tooltipCtx.lineTo(CANVAS_SIZE.width - CANVAS_SIZE.right, e.offsetY);
        tooltipCtx.stroke();
      }
      tooltipCtx.restore();
    });

    return () => {
      ctx.clearRect(0, 0, CANVAS_SIZE.width, CANVAS_SIZE.height);
    };
  }, [candles, handleLeft, xScale, time]);

  return (
    <div style={{ position: "relative", height: "800px", width: "100%" }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE.width}
        height={CANVAS_SIZE.height}
        style={{
          position: "absolute",
          left: 0,
        }}
      />
      <canvas
        ref={tooltipCanvasRef}
        width={CANVAS_SIZE.width}
        height={CANVAS_SIZE.height}
        style={{
          position: "absolute",
          left: 0,
        }}
      />
      <canvas
        ref={screenRef}
        width={CANVAS_SIZE.width}
        height={CANVAS_SIZE.height}
        style={{
          position: "absolute",
          left: 0,
        }}
      />
    </div>
  );
}

export default Chart;
