import { combineHandlers } from 'use-flexible-undo';

export const makeUndoableFTHandler2 = <S, R, X>(
  stateSetter: (s: S, rest: X) => R
) =>
  combineHandlers<{ from: S; to: S; rest: X }, R>(
    ({ to, rest }) => stateSetter(to, rest),
    ({ from, rest }) => stateSetter(from, rest)
  );

export const makeUndoableFTXHandler = <S, R, X>(
  stateSetter: (s: S, rest: X) => R
) =>
  combineHandlers<{ from: S; to: S } & X, R>(
    ({ to, ...rest }) => stateSetter(to, rest as X),
    ({ from, ...rest }) => stateSetter(from, rest as X)
  );

export const makeUndoableFTHandler3 = <S, P extends { to: S }, R>(
  stateSetter: (p: P) => R
) => {
  return combineHandlers<{ from: S } & P, R>(
    ({ to, ...rest }) => stateSetter({ ...rest, to } as P),
    ({ from, ...rest }) => stateSetter(({ ...rest, to: from } as any) as P)
  );
};
