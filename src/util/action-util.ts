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
