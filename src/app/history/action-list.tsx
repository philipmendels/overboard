import React, { useState, ReactElement, ReactNode } from 'react';
import styled from '@emotion/styled';
import { Menu, MenuList, MenuButton, MenuItem } from '@reach/menu-button';
import '@reach/menu-button/styles.css';
import {
  HistoryItemUnion,
  History,
  getCurrentBranch,
  BranchSwitchModus,
} from 'undomundo';
import { GitBranchIcon, DotIcon } from '@primer/octicons-react';
import { BranchConnection, getSideBranches } from './helpers';
import { formatTime, useInterval } from './history.util';
import { PBT } from '../actions/actions';
import { CustomBranchData } from './types';

type ConvertFn = (action: HistoryItemUnion<PBT>) => ReactNode;

interface ActionListProps {
  history: History<PBT, CustomBranchData>;
  timeTravel: (index: number, branchId?: string) => void;
  switchToBranch: (branchId: string, travelTo?: BranchSwitchModus) => void;
  describeAction: ConvertFn;
}

const start = new Date();

export const ActionList = ({
  history,
  timeTravel,
  switchToBranch,
  describeAction,
}: ActionListProps): ReactElement | null => {
  const [now, setNow] = useState(new Date());
  useInterval(() => setNow(new Date()), 5000);

  const currentBranch = getCurrentBranch(history);
  const stack = currentBranch.stack;

  const connections = getSideBranches(currentBranch.id, true)(history);

  return (
    <div
      style={{
        position: 'relative',
        flex: '1 1 0',
        minHeight: 0,
        overflow: 'auto',
        padding: '16px',
      }}
    >
      {stack
        .slice()
        .reverse()
        .map((action, index) => {
          const invertedIndex = stack.length - 1 - index;

          return (
            <StackItem
              created={new Date(action.created)}
              key={action.id}
              isCurrent={history.currentIndex === invertedIndex}
              timeTravel={() => {
                timeTravel(invertedIndex);
              }}
              now={now}
              label={describeAction(action)}
              connections={connections.filter(
                c => c.globalIndex === invertedIndex
              )}
              switchToBranch={switchToBranch}
            />
          );
        })}
      <StackItem
        created={start}
        now={now}
        isCurrent={history.currentIndex === -1}
        timeTravel={() => timeTravel(-1)}
        label="Start"
        connections={connections.filter(c => c.globalIndex === -1)}
        switchToBranch={switchToBranch}
      />
    </div>
  );
};

interface StackItemProps {
  now: Date;
  connections: BranchConnection[];
  switchToBranch: (branchId: string, travelTo?: BranchSwitchModus) => void;
  timeTravel: () => void;
  isCurrent: boolean;
  label?: ReactNode;
  created: Date;
}

const StackItem = ({
  isCurrent,
  now,
  created,
  connections,
  timeTravel,
  switchToBranch,
  label,
}: StackItemProps): ReactElement | null => {
  // const { created, type, payload } = action;
  return (
    <StackItemRoot>
      <div
        style={{
          color: '#48a7f6',
          padding: '8px 0 0 ',
          flex: '0 0 20px',
        }}
      >
        {connections.length > 0 ? (
          <Menu>
            <MenuButton>
              <GitBranchIcon size={16} />
            </MenuButton>
            <MenuListStyled>
              {connections.map(c => (
                <MenuItemStyled
                  key={c.branches[0].id}
                  onSelect={() =>
                    switchToBranch(c.branches[0].id, 'LAST_COMMON_ACTION')
                  }
                >
                  {`Switch to branch ${c.branches
                    .map(b => b.custom.number)
                    .join(', ')
                    .replace(/,(?=[^,]*$)/, ' and')}`}
                </MenuItemStyled>
              ))}
            </MenuListStyled>
          </Menu>
        ) : (
          <span
            style={{
              color: '#bbb',
              marginLeft: '1px',
              display: 'inline-block',
            }}
          >
            <DotIcon size={10} verticalAlign="middle" />
          </span>
        )}
      </div>
      <StackItemContent isCurrent={isCurrent} onClick={timeTravel}>
        <div className="time" style={{ minWidth: '120px' }}>
          {formatTime(created, now)}
        </div>
        <div className="description" style={{ flex: 1, whiteSpace: 'nowrap' }}>
          {label}
        </div>
      </StackItemContent>
    </StackItemRoot>
  );
};

const StackItemRoot = styled.div`
  display: flex;
  height: 32px;
  box-sizing: border-box;
  [data-reach-menu-button] {
    display: flex;
    color: #48a7f6;
    background: transparent;
    border: none;
    padding: 2px;
    cursor: pointer;
    &:focus {
      outline: none;
    }
    &:hover {
      background: #f7f8fa;
    }
    &[aria-expanded='true'] {
      color: white;
      background: #48a7f6;
    }
  }
`;

const MenuListStyled = styled(MenuList)`
  padding: 0;
  border: 1px solid #48a7f6;
  box-shadow: 0 1px 5px 0 rgba(0, 0, 0, 0.1);
`;

const MenuItemStyled = styled(MenuItem)`
  font-family: Verdana, sans-serif;
  padding: 8px 16px;
  &[data-selected] {
    background: #f7f8fa;
    color: black;
  }
`;

const StackItemContent = styled.div<{ isCurrent: boolean }>`
  padding: 8px 16px;
  display: flex;
  &:hover {
    background: #f7f8fa;
  }
  cursor: pointer;
  .time {
    color: ${({ isCurrent }) => (isCurrent ? '#48a7f6' : '#BBB')};
  }
  ${({ isCurrent }) =>
    isCurrent &&
    `
    color: #48a7f6;
    cursor: default;
    `}
`;
