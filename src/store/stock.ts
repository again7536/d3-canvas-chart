import { makeAutoObservable, toJS } from "mobx";
import { Candle, Trade } from "../types";
import RootStore from ".";
import moment from "moment";
import { produce } from "immer";
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

  constructor(rootStore: RootStore) {
    makeAutoObservable(this);
    this.rootStore = rootStore;
  }

  addTrade(trade: Trade) {
    this.trades = [...this.trades, trade];
  }

  addTradeToCandle(trade: Trade) {
    if (
      moment(trade.trade_timestamp).diff(
        moment(this.candles[this.candles.length - 1].candle_date_time_kst).add(
          1,
          "minutes"
        )
      ) <= 0
    )
      this.candles = produce(toJS(this.candles), (draft) => {
        const prev = draft[draft.length - 1];
        draft[draft.length - 1] = {
          ...prev,
          timestamp: trade.trade_timestamp,
          trade_price: trade.trade_price,
          high_price: Math.max(prev.high_price, trade.trade_price),
          low_price: Math.min(prev.low_price, trade.trade_price),
          candle_acc_trade_volume:
            prev.candle_acc_trade_volume + trade.trade_volume,
        };
      });
    else
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
          opening_price: this.candles[this.candles.length - 1].trade_price,
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
    this.candles = data.sort((d1, d2) =>
      moment(d1.candle_date_time_kst).diff(moment(d2.candle_date_time_kst))
    );
  }
}

export default StockStore;
