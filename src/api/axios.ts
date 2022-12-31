import axios from "axios";

const instance = axios.create({ baseURL: "https://api.upbit.com/v1" });

instance.interceptors.response.use((res) => {
  if (res.status === 500) console.error("server error");
  return res;
});

export default instance;
