import { Bounds } from "../models/geom/bounds.model";
import { css } from "@emotion/core";

type ObjMap<V> = Record<string, V>;

type Selector<V> = (value: V) => boolean;
type Updater<V> = (value: V) => V;
type VinKVUpdater<K, V> = (kv: [K, V]) => V;

interface ObjWithId {
  id: string;
  [key: string]: any;
}

const valueEquals = <V>(v: V) => (v: V) => v === v;
export const idEquals = (id: string) => (obj: ObjWithId) => obj.id === id;
export const idEqualsNot = (id: string) => <O extends ObjWithId>(obj:O) => obj.id !== id;
const keyEquals = <K, V>(key: K) => ([k, _]: [K, V]) => key === k;
export const keyEqualsNot = <K, V>(key: K) => ([k, _]: [K, V]) => key !== k;

export const valueToKV = <K, V>(v: V) => (k: K) => [k, v] as [K, V];

export const merge = <V extends object>(
  partial: Partial<V>
): Updater<V> => object => ({
  ...object,
  ...partial
});

export const mergeKV = <K, V extends object>(
  partial: Partial<V>
): Updater<[K, V]> => ([k, v]) => [
  k,
  {
    ...v,
    ...partial
  }
];

const getKVUpdater = <K, V>(
  updater: VinKVUpdater<K, V>
): Updater<[K, V]> => kv => [kv[0], updater(kv)];

const updateSelectively = <V>(selector: Selector<V>, updater: Updater<V>) => (
  v: V
): V => (selector(v) ? updater(v) : v);

/**
 * Curried function that takes a selector fn (A) and updater fn (B), and returns a
 * function that takes an array and returns a shallow copy for which
 * the items are selectively updated using A and B.
 * @param selector
 * Predicate function that takes an item from the array and that needs to return a
 * boolean that indicates if the item should be updated.
 * @param updater
 * Function that takes a an item from the array and that needs to return an updated item.
 * Only called when the selector returns true for the same item.
 */
export const updateSomeInArray = <V>(
  selector: Selector<V>,
  updater: Updater<V>
): Updater<V[]> => mapArray(updateSelectively(selector, updater));

export const mapArray = <V>(mapFn: Updater<V>): Updater<V[]> => array =>
  array.map(mapFn);

export const concatArray = <V>(arrayOrValue: V[] | V): Updater<V[]> => arr =>
  arr.concat(arrayOrValue);

export const filterArray = <V>(
  filter: Selector<V>
): Updater<Array<V>> => array => array.filter(filter);

export const filterArrayById = <O extends ObjWithId>(item: O) => filterArray(idEqualsNot(item.id))

/**
 * Curried function that takes a selector fn (A) and updater fn (B), and returns a
 * function that takes an object and returns a shallow copy for which
 * the values are selectively updated using A and B.
 * @param selector
 * Predicate function that takes a key-value pair (object entry) and that needs to return a
 * boolean that indicates if the value should be updated.
 * @param updater
 * Function that takes a key-value pair (object entry) and that needs to return an updated value.
 * Only called when the selector returns true for the same pair. In order to cater for the
 * most common use case, this function does not enable you to update the key.
 */
export const updateSomeInObjMap = <V>(
  selector: Selector<[string, V]>,
  updater: VinKVUpdater<string, V>
): Updater<ObjMap<V>> =>
  mapObjMap(updateSelectively(selector, getKVUpdater(updater)));

/**
 * Curried function that takes an updater fn (A) and returns a
 * function that takes an object and returns a shallow copy for which
 * all values are updated using A.
 * @param updater
 * Function that takes a key-value pair (object entry) and that needs to return an updated value.
 * Only called when the selector returns true for the same pair. In order to cater for the
 * most common use case, this function does not enable you to update the key.
 */
export const updateAllInObjMap = <V>(
  updater: VinKVUpdater<string, V>
): Updater<ObjMap<V>> => mapObjMap(getKVUpdater(updater));

export const mapObjMap = <V>(
  updater: Updater<[string, V]>
): Updater<ObjMap<V>> => objMap =>
  Object.fromEntries(Object.entries(objMap).map(updater));

export const filterObjMap = <V>(
  filter: Selector<[string, V]>
): Updater<ObjMap<V>> => objMap =>
  Object.fromEntries(Object.entries(objMap).filter(filter));

export const addToObjMap = <V>(
  entryOrEntries: [string, V][]
): Updater<ObjMap<V>> => objMap =>
  Object.fromEntries(Object.entries(objMap).concat(entryOrEntries));

/**
 * Curried function that takes a selector fn (A) and updater fn (B), and returns a
 * function that takes a Map and returns a shallow copy for which
 * the values are selectively updated using A and B.
 * @param selector
 * Predicate function that takes a key-value pair (Map entry) and that needs to return a
 * boolean that indicates if the value should be updated.
 * @param updater
 * Function that takes a key-value pair (Map entry) and that needs to return an updated value.
 * Only called when the selector returns true for the same pair. In order to cater for the
 * most common use case, this function does not enable you to update the key.
 */
export const updateSomeInMap = <K, V>(
  selector: Selector<[K, V]>,
  updater: VinKVUpdater<K, V>
): Updater<Map<K, V>> => map =>
  new Map(
    Array.from(
      map.entries(),
      updateSelectively(selector, getKVUpdater(updater))
    )
  );

export const isSelectionKeyDown = (event: React.MouseEvent<any>) => {
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

export const px = (v: string | number) => v + "px";

export const BoundsToCSS = (bounds: Bounds) => css`
  left: ${bounds.left()}px;
  right: ${bounds.right()}px;
  top: ${bounds.top()}px;
  bottom: ${bounds.bottom()}px;
`;

export const BoundsToRectStyle = (bounds: Bounds) => ({
  left: bounds.left() + "px",
  top: bounds.top() + "px",
  width: bounds.width() + "px",
  height: bounds.height() + "px"
});

export const BoundsToBoundsStyle = (bounds: Bounds) => ({
  left: bounds.left() + "px",
  top: bounds.top() + "px",
  right: bounds.right() + "px",
  bottom: bounds.bottom() + "px"
});
