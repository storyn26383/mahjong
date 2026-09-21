import { emptyManualSelection, type ManualSelection } from '~~/engine/manual-scoring'

export enum ScoringMode {
  Automatic = 'automatic',
  Manual = 'manual',
}

/** 算台頁嘅自動／手動切換同手動勾選，留喺記憶體。 */
export const useScoringMode = () => ({
  mode: useState<ScoringMode>('scoring-mode', () => ScoringMode.Automatic),
  selection: useState<ManualSelection>('manual-selection', emptyManualSelection),
})
