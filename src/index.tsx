import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { rootStore, StoreContext } from "./store";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(
  <StoreContext.Provider value={rootStore}>
    <App />
  </StoreContext.Provider>
);
