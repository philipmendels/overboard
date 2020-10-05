import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Board } from './components/board';

var mountNode = document.getElementById('app');
ReactDOM.render(<Board />, mountNode);
