import { useState, useCallback } from 'react';

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export function useUndoRedo<T>(initialState: T, maxHistory: number = 50) {
  const [state, setState] = useState<HistoryState<T>>({
    past: [],
    present: initialState,
    future: [],
  });

  const set = useCallback(
    (newPresent: T) => {
      setState((currentState) => {
        // Prevent adding redundant states
        if (currentState.present === newPresent) {
          return currentState;
        }

        const newPast = [...currentState.past, currentState.present];
        // Enforce max history length to prevent memory leaks
        if (newPast.length > maxHistory) {
          newPast.shift();
        }

        return {
          past: newPast,
          present: newPresent,
          future: [], // Clear future on new action
        };
      });
    },
    [maxHistory]
  );

  const undo = useCallback(() => {
    setState((currentState) => {
      if (currentState.past.length === 0) return currentState;

      const previous = currentState.past[currentState.past.length - 1];
      const newPast = currentState.past.slice(0, currentState.past.length - 1);

      return {
        past: newPast,
        present: previous,
        future: [currentState.present, ...currentState.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((currentState) => {
      if (currentState.future.length === 0) return currentState;

      const next = currentState.future[0];
      const newFuture = currentState.future.slice(1);

      return {
        past: [...currentState.past, currentState.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  return {
    state: state.present,
    past: state.past,
    future: state.future,
    set,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
