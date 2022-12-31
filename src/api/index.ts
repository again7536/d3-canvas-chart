import { Candle } from "../types";
import axios from "./axios";

interface FetchCandlesParams {
  market: string;
  unit: number;
  count: number;
}
const fetchCandles = async ({ market, unit, count }: FetchCandlesParams) => {
  const res = await axios.get<Candle[]>(
    `/candles/minutes/${unit}?market=${market}&count=${count}`
  );
  return res.data;
};

export { fetchCandles };
