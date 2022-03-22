import { History, Branch } from 'undomundo';
import { PBT } from '../actions/actions';
import { CustomBranchData } from './types';

export type BranchConnection = {
  globalIndex: number;
  branches: Branch<PBT, CustomBranchData>[];
};

export const getSideBranches = (branchId: string, flatten: boolean) => (
  history: History<PBT, CustomBranchData>
): BranchConnection[] =>
  Object.values(history.branches)
    .filter(b => b.parentConnection?.branchId === branchId)
    .map(b => {
      const flattenedBranches = flatten
        ? getSideBranches(b.id, true)(history).flatMap(con => con.branches)
        : [];
      return {
        globalIndex: b.parentConnection!.globalIndex,
        branches: [b, ...flattenedBranches],
      };
    });
