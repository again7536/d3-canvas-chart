import { createContext } from "react";
import StockStore from "./stock";

class RootStore {
  stockStore: StockStore;

  constructor() {
    this.stockStore = new StockStore(this);
  }
}

const rootStore = new RootStore();
const StoreContext = createContext(rootStore);

export default RootStore;
export { rootStore, StoreContext };
