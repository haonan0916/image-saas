import { Uppy, State, Body } from "@uppy/core";
import { useMemo } from "react";
import { useSyncExternalStore } from "react";

export function useUppyState<T, TMeta extends Record<string, unknown>>(
  uppy: Uppy<TMeta>,
  selector: (state: State<TMeta, Body>) => T
) {
  const store = uppy.store;
  const subscribe = useMemo(() => store.subscribe.bind(store), [store]);
  const getSnapshot = useMemo(() => store.getState.bind(store), [store]);

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return selector(state);
}