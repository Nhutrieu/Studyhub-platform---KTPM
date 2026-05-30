import { useCallback } from "react";
import { toast as reactToast } from "react-toastify";

export function useToast() {
  const error = useCallback((message: string) => {
    reactToast.error(message);
  }, []);

  const success = useCallback((message: string) => {
    reactToast.success(message);
  }, []);

  const warning = useCallback((message: string) => {
    reactToast.warning(message);
  }, []);

  const info = useCallback((message: string) => {
    reactToast.info(message);
  }, []);

  return { error, success, warning, info };
}
