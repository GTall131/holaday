import { useSyncExternalStore } from "react";
import { subscribe, getVersion } from "./store";

// Components that call this just want "re-render when the store
// changes" — they read the live values straight off `state` (imported
// directly from store.js) rather than off the returned version number.
export function useStoreVersion(){
  return useSyncExternalStore(subscribe, getVersion);
}
