import { VectorData, Vector } from './geom/vector.model';
import { randomText } from '../util/random-text';
import { v4 } from 'uuid';

export type CardData = {
  id: string;
  location: VectorData;
  dimensions: VectorData;
  text: string;
};

const defaultCardSize = new Vector(120, 90);

export const minCardSize = new Vector(20, 20);

export const createNewCard = (vector: Vector): CardData => ({
  id: v4(),
  text: randomText(),
  location: Vector.fromData(vector).subtract(defaultCardSize.multiply(0.5)),
  dimensions: defaultCardSize.clone(),
});
