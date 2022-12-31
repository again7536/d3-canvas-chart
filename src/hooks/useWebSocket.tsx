import { useEffect, useRef, useState } from "react";

interface UseWebSocketProps<T> {
  url: string;
  onOpen?: (e: Event) => void;
  onClose?: (e: CloseEvent) => void;
  onMessage?: (e: MessageEvent<T>) => void;
  onError?: (e: Event) => void;
}

function useWebSocket<T>({
  url,
  onOpen,
  onClose,
  onMessage,
  onError,
}: UseWebSocketProps<T>): [
  React.MutableRefObject<WebSocket | undefined>,
  number
] {
  const wsRef = useRef<WebSocket>();
  const [status, setStatus] = useState<number>(WebSocket.CLOSED);

  useEffect(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;
    setStatus(WebSocket.CONNECTING);

    return () => ws.close();
  }, [url]);

  useEffect(() => {
    if (!wsRef.current) return;
    const openHandler = onOpen ?? console.log;
    wsRef.current.addEventListener("open", (e) => {
      setStatus(WebSocket.OPEN);
      openHandler(e);
    });

    return () => wsRef.current?.removeEventListener("open", openHandler);
  }, [onOpen]);

  useEffect(() => {
    if (!wsRef.current) return;
    const closeHandler = onClose ?? console.log;
    wsRef.current.addEventListener("close", (e) => {
      setStatus(WebSocket.CLOSED);
      closeHandler(e);
    });

    return () => wsRef.current?.removeEventListener("close", closeHandler);
  }, [onClose]);

  useEffect(() => {
    if (!wsRef.current) return;
    const messageHandler = onMessage ?? console.log;
    wsRef.current.addEventListener("message", messageHandler);

    return () => wsRef.current?.removeEventListener("message", messageHandler);
  }, [onMessage]);

  useEffect(() => {
    if (!wsRef.current) return;
    const errorHandler = onError ?? console.error;
    wsRef.current.addEventListener("error", errorHandler);

    return () => wsRef.current?.removeEventListener("error", errorHandler);
  }, [onError]);

  return [wsRef, status];
}

export default useWebSocket;
