export type PickChoice = 'first' | 'last'

export function startingSide(choice: PickChoice): 'A' | 'B' {
  return choice === 'last' ? 'B' : 'A'
}

export function pickChoiceLabel(choice: PickChoice): string {
  return choice === 'last' ? 'last pick' : 'first pick'
}
