import { SetStateAction } from "react";
import { PayloadFromTo, PayloadHandler, Undoable } from "use-flexible-undo";

export interface Action<T> {
  id: string;
  describe: (payload: T) => string;
  do: (payload: T) => void;
  undo: (payload: T) => void;
}

const actions: Action<any>[] = [];

export const registerAction = <P>(action: Action<P>) => {
  if (actions.find(a => a.id === action.id)) {
    throw new Error(`Action ${action.id} is already registered`);
  } else {
    actions.push(action);
  }
  return action;
};

const createStackItem = <P>(action: Action<P>, payload: P) => ({
  actionId: action.id,
  payload
});

type StackItem = ReturnType<typeof createStackItem>;

export const stack: StackItem[] = [];
const future: StackItem[] = [];

export const undo = () => {
  if (stack.length) {
    const item = stack.pop()!;
    actions.find(action => action.id === item.actionId)!.undo(item.payload);
    future.unshift(item);
  }
};

export const redo = () => {
  if (future.length) {
    const item = future.shift()!;
    actions.find(action => action.id === item.actionId)!.do(item.payload);
    stack.push(item);
  }
};

export const doAction = <P>(action: Action<P>, payload: P) => {
  action.do(payload);
  const stackItem = createStackItem(action, payload);
  stack.push(stackItem);
};

export const combineHandlers = <P, R>(
  drdo: PayloadHandler<P, R>,
  undo: PayloadHandler<P, R>
): Undoable<PayloadHandler<P, R>> => ({
  drdo,
  undo,
});

type InferState<S> = S extends SetStateAction<infer S2> ? S2 : S;

export const makeUndoableFTHandler2 = <S, R, X>(stateSetter: (s: S, rest:X) => R) =>
  combineHandlers<{from: S, to:S, rest: X }, R>(
    ({ to, rest }) => stateSetter(to, rest),
    ({ from, rest }) => stateSetter(from, rest)
  );

export const makeUndoableFTXHandler= <S, R, X>(stateSetter: (s: S, rest:X) => R) =>
  combineHandlers<{from: S, to:S} & X, R>(
    ({ to, ...rest }) => stateSetter(to, rest as X),
    ({ from, ...rest }) => stateSetter(from, rest as X)
  );

export const makeUndoableFTHandler3 = <S, P extends {to: S}, R>(stateSetter: (p:P) => R) => {
  return combineHandlers<{from: S} & P, R>(
    ({ to, ...rest }) => stateSetter({...rest, to} as P),
    ({ from, ...rest }) => stateSetter({...rest, to: from} as any as P)
  );
}