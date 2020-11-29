import { Bounds } from '../geom/bounds.model';
import { css } from '@emotion/core';
import { StandardSelectionState } from '../actions/selection';
import * as R from 'rambda';

type ObjMap<V> = Record<string, V>;

type Selector<V> = (value: V) => boolean;
type Updater<V> = (value: V) => V;
type VinKVUpdater<K, V> = (kv: [K, V]) => V;

interface ObjWithId {
  id: string;
  [key: string]: unknown;
}

export const notEquals = <V>(v1: V) => (v: V) => v1 !== v;
export const valueEquals = <V>(v1: V) => (v: V) => v1 === v;
export const idEquals = (id: string) => <O extends ObjWithId>(obj: O) =>
  obj.id === id;
export const idEqualsNot = (id: string) => <O extends ObjWithId>(obj: O) =>
  obj.id !== id;
export const keyEqualsNot = <K, V>(key: K) => ([k]: [K, V]) => key !== k;
export const keyNotIncluded = <K, V>(keys: K[]) => ([k]: [K, V]) =>
  !keys.includes(k);

export const valueToKV = <K, V>(v: V) => (k: K) => [k, v] as [K, V];

export const merge = <S, P extends Partial<S>>(
  partial: P
): Updater<S> => state => ({
  ...state,
  ...partial,
});

export const mergeKV = <K, V extends Record<string, unknown>>(
  partial: Partial<V>
): Updater<[K, V]> => ([k, v]) => [
  k,
  {
    ...v,
    ...partial,
  },
];

const getKVUpdater = <K, V>(
  updater: VinKVUpdater<K, V>
): Updater<[K, V]> => kv => [kv[0], updater(kv)];

const updateSelectively = <V>(selector: Selector<V>, updater: Updater<V>) => (
  v: V
): V => (selector(v) ? updater(v) : v);

export const updateSomeInArray = <V>(
  selector: Selector<V>,
  updater: Updater<V>
): Updater<V[]> => mapArray(updateSelectively(selector, updater));

export const mapArray = <V>(mapFn: Updater<V>): Updater<V[]> => array =>
  array.map(mapFn);

export const concatArray = <V>(arrayOrValue: V[] | V): Updater<V[]> => arr =>
  arr.concat(arrayOrValue);

export const concatSet = <V>(arrayOrValue: V[] | V): Updater<Set<V>> => prev =>
  new Set([...prev].concat(arrayOrValue));

export const filterArray = <V>(
  filter: Selector<V>
): Updater<Array<V>> => array => array.filter(filter);

export const filterSet = <V>(filter: Selector<V>): Updater<Set<V>> => prev =>
  new Set([...prev].filter(filter));

export const filterArrayById = <O extends ObjWithId>(item: O) =>
  filterArray(idEqualsNot(item.id));
export const filterArrayByIds = <O extends ObjWithId>(items: O[]) =>
  filterArray<O>(item => !items.find(idEquals(item.id)));

export const addByIndex = <T>(list: { index: number; element: T }[]) => (
  prev: T[]
) => {
  const clone = prev.slice();
  const pSorted = list.slice().sort((a, b) => a.index - b.index);
  pSorted.forEach(item => clone.splice(item.index, 0, item.element));
  return clone;
};

export const reduceSelection = <T>(
  selection: StandardSelectionState,
  fn: (id: string) => T
) =>
  Object.keys(selection).reduce<Record<string, T>>((acc, id) => {
    acc[id] = fn(id);
    return acc;
  }, {});

export const addByIndexMapped = <P, T>(
  mapFn: (item: P) => { index: number; element: T }
) => (payload: P[]) => addByIndex(payload.map(mapFn));

export const updateSomeInObjMap = <V>(
  selector: Selector<[string, V]>,
  updater: VinKVUpdater<string, V>
): Updater<ObjMap<V>> =>
  mapObjMap(updateSelectively(selector, getKVUpdater(updater)));

export const updateAllInObjMap = <V>(
  updater: VinKVUpdater<string, V>
): Updater<ObjMap<V>> => mapObjMap(getKVUpdater(updater));

export const mapObjMap = <V>(
  updater: Updater<[string, V]>
): Updater<ObjMap<V>> => objMap =>
  Object.fromEntries(Object.entries(objMap).map(updater));

export const mapObjMap2 = <
  O extends Record<string, unknown>,
  O2 extends Record<string, unknown>
>(
  mapFn: (e: Entry<O>) => Entry<O2>
) => (objMap: O) => fromEntries(toEntries(objMap).map(mapFn));

export const mapObjMapValues = <
  O extends Record<string, unknown>,
  O2 extends Record<string, unknown>
>(
  mapFn: (e: Entry<O>) => ValueOf<O2>
) => (objMap: O) =>
  fromEntries(
    toEntries(objMap).map(([k, v]) => [k as keyof O2, mapFn([k, v])])
  );

export const filterObjMap = <V>(
  filter: Selector<[string, V]>
): Updater<ObjMap<V>> => objMap =>
  Object.fromEntries(Object.entries(objMap).filter(filter));

export const addToObjMap = <V>(
  entryOrEntries: [string, V][]
): Updater<ObjMap<V>> => objMap =>
  Object.fromEntries(Object.entries(objMap).concat(entryOrEntries));

export type Entry<O extends Record<string, unknown>> = {
  [K in keyof O]: [K, O[K]];
}[keyof O];

export type ValueOf<T> = T[keyof T];

export const concatObjMapEntries = <O extends Record<string, unknown>>(
  entries: Entry<O>[]
) => (o: O) => fromEntries(toEntries(o).concat(entries));

export const filterObjMapEntries = <O extends Record<string, unknown>>(
  filter: Selector<Entry<O>>
) => (objMap: O) => fromEntries(toEntries(objMap).filter(filter));

const toEntries = <O extends Record<string, unknown>>(obj: O) =>
  Object.entries(obj) as Entry<O>[];

const fromEntries = <O extends Record<string, unknown>>(entries: Entry<O>[]) =>
  Object.fromEntries(entries) as O;

export const isSelectionKeyDown = (event: React.MouseEvent<unknown>) => {
  if (event.shiftKey || event.metaKey || event.ctrlKey) {
    return true;
  }
  return false;
};

export const handleSelection = (
  e: React.MouseEvent,
  isSelected: boolean,
  clearSelection: () => void,
  select: () => void,
  deselect: () => void
) => {
  if (isSelectionKeyDown(e)) {
    if (!isSelected) {
      select();
    } else {
      deselect();
    }
  } else {
    if (!isSelected) {
      clearSelection();
      select();
    }
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Fn = (...args: any[]) => any;

export const wrapFunction = (callback: Fn) => <F extends Fn>(fn: F) => (
  ...args: Parameters<F>
) => {
  callback();
  fn(...args);
};

export const isItemInSelectionSet = (selection: Set<string>) => <
  T extends ObjWithId
>(
  item: T
) => selection.has(item.id);

export const isItemSelected = (selection: string[]) => <T extends ObjWithId>(
  item: T
) => selection.includes(item.id);

export const isItemInSelectionRecord = (selection: Record<string, unknown>) => <
  T extends ObjWithId
>(
  item: T
) => selection[item.id] !== undefined;

export const updateIfSelected = <
  U extends unknown,
  S extends Record<string, U>,
  T extends ObjWithId
>(
  selection: S,
  whenTrueFn: (a: T) => T
) => R.map(R.when(isItemInSelectionRecord(selection), whenTrueFn));

export const px = (v: string | number) => v + 'px';

export const BoundsToCSS = (bounds: Bounds) => css`
  left: ${bounds.getLeft()}px;
  right: ${bounds.getRight()}px;
  top: ${bounds.getTop()}px;
  bottom: ${bounds.getBottom()}px;
`;

export const BoundsToRectStyle = (bounds: Bounds) => ({
  left: bounds.getLeft() + 'px',
  top: bounds.getTop() + 'px',
  width: bounds.getWidth() + 'px',
  height: bounds.getHeight() + 'px',
});

export const BoundsToBoundsStyle = (bounds: Bounds) => ({
  left: bounds.getLeft() + 'px',
  top: bounds.getTop() + 'px',
  right: bounds.getRight() + 'px',
  bottom: bounds.getBottom() + 'px',
});
