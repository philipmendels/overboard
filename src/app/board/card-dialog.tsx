import Dialog from '@reach/dialog';
import styled from '@emotion/styled';
import React from 'react';
import '@reach/dialog/styles.css';

const DialogStyled = styled(Dialog)`
  border: 1px solid #eee;
  z-index: 1;
  width: 300px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  textarea {
    resize: none;
    padding: 8px;
    margin-bottom: 8px;
    height: 100px;
  }
  .footer {
    display: flex;
    justify-content: flex-end;
    > button {
      margin-left: 8px;
      padding: 4px 8px;
    }
  }
  textarea,
  button {
    font-family: Verdana, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    outline-color: #48a7f6;
  }
`;

interface Props {
  isOpen: boolean;
  textClone: string;
  onChange: (data: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export const CardDialog: React.FC<Props> = ({
  isOpen,
  textClone,
  onChange,
  onCancel,
  onSubmit,
}) => {
  return (
    <DialogStyled aria-label="text dialog" isOpen={isOpen} onDismiss={onCancel}>
      <textarea
        value={textClone}
        onChange={e => onChange(e.currentTarget.value)}
      ></textarea>

      <div className="footer">
        <button onClick={onCancel}>Cancel</button>
        <button onClick={onSubmit}>Update text</button>
      </div>
    </DialogStyled>
  );
};
