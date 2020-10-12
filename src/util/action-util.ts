import { combineHandlers } from 'use-flexible-undo';

export const makeUndoableFTXHandler = <S, R, X>(
  stateSetter: (s: S, rest: X) => R
) =>
  combineHandlers<{ from: S; to: S } & X, R>(
    ({ to, ...rest }) => stateSetter(to, rest as X),
    ({ from, ...rest }) => stateSetter(from, rest as X)
  );
