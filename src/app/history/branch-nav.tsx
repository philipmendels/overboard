import { ReactElement, useState } from 'react';
import styled from '@emotion/styled';
import {
  ListboxInput,
  ListboxButton,
  ListboxPopover,
  ListboxList,
  ListboxOption,
} from '@reach/listbox';
import '@reach/listbox/styles.css';
import { TriangleDownIcon } from '@primer/octicons-react';

import {
  BranchSwitchModus,
  History,
  getCurrentBranch,
  canUndo,
  canRedo,
} from 'undomundo';
import { getLastItem, formatTime, useInterval } from './history.util';
import { CustomBranchData } from './types';
import { PBT } from '../actions/actions';

interface BranchNavProps {
  history: History<PBT, CustomBranchData>;
  switchToBranch: (branchId: string, travelTo?: BranchSwitchModus) => void;
  undo: () => void;
  redo: () => void;
}

export const BranchNav = ({
  history,
  switchToBranch,
  undo,
  redo,
}: BranchNavProps): ReactElement | null => {
  const [now, setNow] = useState(new Date());
  useInterval(() => setNow(new Date()), 5000);
  const branchList = Object.values(history.branches).sort(
    (a, b) =>
      new Date(getLastItem(b.stack)?.created ?? b.created).getTime() -
      new Date(getLastItem(a.stack)?.created ?? b.created).getTime()
  );
  const currentBranch = getCurrentBranch(history);

  return (
    <Root>
      <ListboxStyled
        disabled={branchList.length === 1}
        value={currentBranch.id}
        onChange={id =>
          id !== currentBranch.id && switchToBranch(id, 'HEAD_OF_BRANCH')
        }
      >
        <ListboxButton arrow={<TriangleDownIcon size={16} />} />
        <ListboxPopover
          style={{
            padding: 0,
            border: 0,
            outline: 'none',
            zIndex: 2,
          }}
        >
          <ListboxListStyled>
            {branchList.map(b => (
              <ListboxOptionStyled
                key={b.id}
                value={b.id}
                label={b.custom.name}
              >
                {`branch ${b.custom.name} (size ${
                  b.parentConnection
                    ? b.parentConnection.globalIndex + b.stack.length + 1
                    : b.stack.length
                }, ${formatTime(
                  new Date(getLastItem(b.stack)?.created ?? b.created),
                  now
                )})`}
              </ListboxOptionStyled>
            ))}
          </ListboxListStyled>
        </ListboxPopover>
      </ListboxStyled>
      <Buttons>
        <button disabled={!canUndo(history)} onClick={() => undo()}>
          undo
          <span
            style={{
              display: 'inline-block',
              marginLeft: '8px',
              transform: 'rotate(-90deg) scale(1.5)',
              opacity: 0.5,
            }}
          >
            &#9100;
          </span>
        </button>
        <button disabled={!canRedo(history)} onClick={() => redo()}>
          <span
            style={{
              display: 'inline-block',
              marginRight: '8px',
              transform: 'rotate(90deg) scale(1.5)',
              opacity: 0.5,
            }}
          >
            &#9100;
          </span>
          redo
        </button>
      </Buttons>
    </Root>
  );
};

const Root = styled.div`
  padding: 16px;
  border-bottom: 1px solid #aaa;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  button {
    font-size: 14px;
    padding: 4px 8px;
    border-radius: 2px;
    font-family: Verdana, sans-serif;
    &:focus {
      outline: 1px solid #48a7f6;
    }
    display: inline-block;
    border: 1px solid #aaa;
    &:hover:not(:disabled) {
      background: #f7f8fa;
    }
    cursor: pointer;
    :disabled {
      border-color: #ddd;
      cursor: inherit;
    }
    min-width: 95px;
  }
`;

const Buttons = styled.div`
  display: flex;
  margin-top: 16px;
  justify-content: space-between;
  > button {
    flex: 1 1 0;
    &:first-of-type {
      margin-right: 16px;
    }
  }
`;

const ListboxStyled = styled(ListboxInput)`
  [data-reach-listbox-button] {
    box-sizing: border-box;
    width: 100%;
    height: 30px;
    background: white;
    padding: 4px 8px;
    font-size: 14px;
    border-radius: 2px;
    border-color: #aaa;
    cursor: pointer;
    &[aria-disabled] {
      cursor: default;
    }
    &:focus {
      outline: 1px solid #48a7f6;
    }
    &:hover {
      background: #f7f8fa;
    }
  }
`;

const ListboxListStyled = styled(ListboxList)`
  padding: 0;
  border: 1px solid #aaa;
  box-shadow: 0 1px 5px 0 rgba(0, 0, 0, 0.1);
`;

const ListboxOptionStyled = styled(ListboxOption)`
  font-family: Verdana, sans-serif;
  font-size: 14px;
  cursor: pointer;
  padding: 8px 16px;
  border: 0;
  max-width: 100%;
  &[aria-selected='true'] {
    background: #f7f8fa;
    color: black;
  }
  &[data-current] {
    color: white;
    background: #48a7f6;
    font-weight: normal;
    cursor: default;
  }
`;
