import { useEffect, useRef } from "react";
import { DeviceEventEmitter } from "react-native";
import { APP_DATA_REFRESH_EVENT } from "../utils/eventBus";

/** Tải lại dữ liệu của màn hình sau khi thao tác thay đổi dữ liệu hoàn tất. */
export function useGlobalDataRefresh(refresh: () => void | Promise<void>) {
  const refreshRef = useRef(refresh);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(APP_DATA_REFRESH_EVENT, () => {
      void refreshRef.current();
    });

    return () => subscription.remove();
  }, []);
}
