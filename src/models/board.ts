import { CardData } from "./card";
import { SelectionState } from "./selection";

export interface BoardState {
  cards: CardData[];
  selection: SelectionState;
  // ui: UiState
}
