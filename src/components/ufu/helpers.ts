import {
  PayloadByType,
  BranchConnection,
  HistoryItemUnion,
  History,
} from 'use-flexible-undo';

export const getCurrentBranch = <PBT extends PayloadByType>(
  prev: History<PBT>
) => prev.branches[prev.currentBranchId];

export const getCurrentIndex = <PBT extends PayloadByType>(
  prev: History<PBT>
) => prev.currentPosition.globalIndex;

export const isUndoPossible = <PBT extends PayloadByType>(
  history: History<PBT>
) => getCurrentIndex(history) > 0;

export const isRedoPossible = <PBT extends PayloadByType>(
  history: History<PBT>
) => {
  const index = getCurrentIndex(history);
  const stack = getCurrentBranch(history).stack;
  return index < stack.length - 1;
};

export const getSideBranches = (branchId: string, flatten: boolean) => <
  PBT extends PayloadByType
>(
  history: History<PBT>
): BranchConnection<PBT>[] =>
  Object.values(history.branches)
    .filter(b => b.parent?.branchId === branchId)
    .map(b => {
      const flattenedBranches = flatten
        ? getSideBranches(b.id, true)(history).flatMap(con => con.branches)
        : [];
      return {
        position: b.parent!.position,
        branches: [b, ...flattenedBranches],
      };
    });
