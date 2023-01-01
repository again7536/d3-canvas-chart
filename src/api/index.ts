import { Candle } from "../types";
import axios from "./axios";

interface FetchCandlesParams {
  market: string;
  unit: number;
  count: number;
  to?: string;
}
const fetchCandles = async ({
  market,
  unit,
  count,
  to,
}: FetchCandlesParams) => {
  const res = await axios.get<Candle[]>(
    to
      ? `/candles/minutes/${unit}?market=${market}&to=${to}&count=${count}`
      : `/candles/minutes/${unit}?market=${market}&count=${count}`
  );
  return res.data;
};

export { fetchCandles };
