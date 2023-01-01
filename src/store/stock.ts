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
  candles: Candle[] = [];
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
      this.candles.length > 0 &&
      moment(trade.trade_timestamp).diff(
        moment(this.candles[this.candles.length - 1].candle_date_time_kst).add(
          1,
          "minutes"
        )
      ) <= 0
    ) {
      const newCandles = [...this.candles];
      const prev = newCandles[newCandles.length - 1];
      newCandles[newCandles.length - 1] = {
        ...prev,
        timestamp: trade.trade_timestamp,
        trade_price: trade.trade_price,
        high_price: Math.max(prev.high_price, trade.trade_price),
        low_price: Math.min(prev.low_price, trade.trade_price),
        candle_acc_trade_volume:
          prev.candle_acc_trade_volume + trade.trade_volume,
      };

      this.candles = newCandles;
    } else
      this.candles = [
        ...this.candles,
        {
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
            this.candles[this.candles.length - 1]?.trade_price ??
            trade.trade_price,
          unit: this.unit,
          candle_acc_trade_price: trade.trade_price,
          candle_acc_trade_volume: trade.trade_volume,
        },
      ];
  }

  *fetchInitCandles(
    params: FetchCandlesParams
  ): Generator<Promise<Candle[]>, void, Candle[]> {
    this.unit = params.unit;
    this.market = params.market;

    const data = yield fetchCandles(params);
    this.candles = data.sort(
      (d1, d2) =>
        Date.parse(d1.candle_date_time_kst) -
        Date.parse(d2.candle_date_time_kst)
    );
  }

  *fetchCandlesToFront(): Generator<Promise<Candle[]>, void, Candle[]> {
    if (this.fetchCandleState) return;

    this.fetchCandleState = true;

    const data = yield fetchCandles({
      count: 200,
      market: this.market,
      unit: this.unit,
      to: moment(this.candles[0].candle_date_time_utc)
        .subtract(1, "minutes")
        .format("YYYY-MM-DD[T]HH:mm:ss[Z]"),
    });

    this.candles = [
      ...data.sort(
        (d1, d2) =>
          Date.parse(d1.candle_date_time_kst) -
          Date.parse(d2.candle_date_time_kst)
      ),
      ...this.candles,
    ];
    this.fetchCandleState = false;
  }
}

export default StockStore;
