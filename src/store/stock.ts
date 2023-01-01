import { flow, makeAutoObservable } from "mobx";
import { Candle, Trade } from "../types";
import RootStore from ".";
import moment from "moment";
import { fetchCandles } from "../api";

interface FetchCandlesParams {
  market: string;
  unit: number;
  count: number;
}

class StockStore {
  rootStore: RootStore;
  unit: number = 0;
  market: string = "";
  trades: Trade[] = [];
  candles: Map<string, Candle> = new Map();
  startTime: string = moment(moment.now())
    .subtract(10, "minute")
    .startOf("minute")
    .format("YYYY-MM-DD[T]HH:mm:ss");
  endTime: string = moment(moment.now())
    .startOf("minute")
    .format("YYYY-MM-DD[T]HH:mm:ss");
  fetchCandleState: boolean = false;

  constructor(rootStore: RootStore) {
    makeAutoObservable(this, { fetchCandlesToFront: flow.bound });
    this.rootStore = rootStore;
  }

  addTrade(trade: Trade) {
    this.trades = [...this.trades, trade];
  }

  addTradeToCandle(trade: Trade) {
    if (
      this.candles.size > 0 &&
      moment(trade.trade_timestamp).diff(
        moment(this.endTime).add(1, "minutes")
      ) <= 0
    ) {
      // mutable
      const prev = this.candles.get(this.endTime);
      if (!prev) return;
      this.candles.set(this.endTime, {
        ...prev,
        timestamp: trade.trade_timestamp,
        trade_price: trade.trade_price,
        high_price: Math.max(prev.high_price, trade.trade_price),
        low_price: Math.min(prev.low_price, trade.trade_price),
        candle_acc_trade_volume:
          prev.candle_acc_trade_volume + trade.trade_volume,
      });
    } else {
      const nextEndTime = moment(this.endTime)
        .add(1, "minutes")
        .format("YYYY-MM-DD[T]HH:mm:ss");

      // mutable
      this.candles.set(nextEndTime, {
        market: this.market,
        candle_date_time_utc: (() => {
          const time = moment(trade.trade_timestamp).startOf("minutes");
          const remainder = time.minutes() % this.unit;
          return time
            .subtract(remainder, "minutes")
            .utc()
            .format("YYYY-MM-DD[T]HH:mm:ss");
        })(),
        candle_date_time_kst: (() => {
          const time = moment(trade.trade_timestamp).startOf("minutes");
          const remainder = time.minutes() % this.unit;
          return time
            .subtract(remainder, "minutes")
            .local()
            .format("YYYY-MM-DD[T]HH:mm:ss");
        })(),
        timestamp: trade.trade_timestamp,
        trade_price: trade.trade_price,
        high_price: trade.trade_price,
        low_price: trade.trade_price,
        opening_price:
          this.candles.get(this.endTime)?.trade_price ?? trade.trade_price,
        unit: this.unit,
        candle_acc_trade_price: trade.trade_price,
        candle_acc_trade_volume: trade.trade_volume,
      });

      this.endTime = nextEndTime;
    }
  }

  *fetchInitCandles(
    params: FetchCandlesParams
  ): Generator<Promise<Candle[]>, void, Candle[]> {
    this.unit = params.unit;
    this.market = params.market;

    const data = yield fetchCandles(params);
    this.candles = new Map(data.map((d) => [d.candle_date_time_kst, d]));
    this.startTime = moment(moment.now())
      .subtract(10, "minute")
      .startOf("minute")
      .format("YYYY-MM-DD[T]HH:mm:ss");
    this.endTime = moment(moment.now())
      .startOf("minute")
      .format("YYYY-MM-DD[T]HH:mm:ss");
  }

  *fetchCandlesToFront(): Generator<Promise<Candle[]>, void, Candle[]> {
    if (this.fetchCandleState) return;

    this.fetchCandleState = true;

    const data = yield fetchCandles({
      count: 200,
      market: this.market,
      unit: this.unit,
      to: moment(this.startTime)
        .subtract(1, "minutes")
        .utc()
        .format("YYYY-MM-DD[T]HH:mm:ss[Z]"),
    });

    this.candles = new Map(
      [...this.candles.entries()].concat(
        data.map((d) => [d.candle_date_time_kst, d] as [string, Candle])
      )
    );
    this.startTime = moment(this.startTime)
      .subtract(200, "minutes")
      .format("YYYY-MM-DD[T]HH:mm:ss");
    this.fetchCandleState = false;
  }
}

export default StockStore;
