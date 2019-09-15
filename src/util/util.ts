type ObjMap<V> = { [key: string]: V };

type Selector<V> = (value: V) => boolean;
type Updater<V> = (value: V) => V;
type VinKVUpdater<K, V> = (kv: [K, V]) => V;

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

const getUpdatedValue = <V>(selector: Selector<V>, updater: Updater<V>) => (
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
export const getUpdatedArray = <V>(
  selector: Selector<V>,
  updater: Updater<V>
): Updater<V[]> => array => array.map(getUpdatedValue(selector, updater));

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
export const getUpdatedObjMap = <V>(
  selector: Selector<[string, V]>,
  updater: VinKVUpdater<string, V>
): Updater<ObjMap<V>> => objMap =>
  Object.fromEntries(
    Object.entries(objMap).map(getUpdatedValue(selector, getKVUpdater(updater)))
  );

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
export const getUpdatedMap = <K, V>(
  selector: Selector<[K, V]>,
  updater: VinKVUpdater<K, V>
): Updater<Map<K, V>> => map =>
  new Map(
    Array.from(map.entries(), getUpdatedValue(selector, getKVUpdater(updater)))
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
