import React, { useContext, useEffect, useState } from "react";
import logo from "./logo.svg";
import "./App.css";
import useWebSocket from "./hooks/useWebSocket";
import { StoreContext } from "./store";
import Chart from "./components/Chart/Chart";
import { observer } from "mobx-react-lite";

const App = observer(() => {
  const [market, setMarket] = useState<string>("KRW-BTC");
  const stockStore = useContext(StoreContext).stockStore;
  const [wsRef, status] = useWebSocket<Blob>({
    url: "wss://api.upbit.com/websocket/v1",
    onMessage: async (e) => {
      const json = JSON.parse(await e.data.text());
      stockStore.addTradeToCandle(json);
    },
  });

  useEffect(() => {
    stockStore.fetchInitCandles({ market, unit: 1, count: 10 });
  }, [market, stockStore]);

  useEffect(() => {
    if (status === WebSocket.OPEN)
      wsRef.current?.send(
        `[{"ticket":"abcdasdfasdf"},{"type":"trade","codes":["${market}"]}]`
      );
  }, [market, status, wsRef]);

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMarket(e.target.value);
  };

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <select onChange={handleSelect}>
          <option value="KRW-BTC">BTC</option>
          <option value="KRW-ETH">ETH</option>
        </select>
        {stockStore.candles.size > 0 && (
          <Chart
            candles={stockStore.candles}
            onLeft={stockStore.fetchCandlesToFront}
            time={{ start: stockStore.startTime, end: stockStore.endTime }}
          />
        )}
      </header>
    </div>
  );
});

export default App;
