import { VectorData, Vector } from './geom/vector.model';
import { randomText } from '../util/random-text';
import { v4 } from 'uuid';

export type CardData = {
  index: number;
  id: string;
  location: VectorData;
  dimensions: VectorData;
  text: string;
  background: string;
};

const defaultCardSize = new Vector(120, 90);

export const minCardSize = new Vector(20, 20);

const colors = [
  '#7550F5',
  '#2F87F7',
  '#4FBFF9',
  '#53BD85',
  '#F7BF42',
  '#EA4968',
];

let globalIndex = 0;

export const createNewCard = (vector: Vector): CardData => ({
  index: globalIndex++,
  id: v4(),
  text: randomText(),
  location: Vector.fromData(vector).subtract(defaultCardSize.multiply(0.5)),
  dimensions: defaultCardSize.clone(),
  background: colors[Math.floor(Math.random() * colors.length)],
});
