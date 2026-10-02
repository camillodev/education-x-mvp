// Known franchise networks for the onboarding autocomplete.
// Keeping these canonical avoids the same network being registered under
// slight name variations ("Kumon" vs "Kumon Brasil"), which would break
// franchise-level grouping/reporting later.
// The user can still type a network not in this list (free text).

export const FRANCHISE_NETWORKS = [
  'Kumon Brasil',
  'Cultura Inglesa',
  'CCAA',
  'Wizard',
  'Fisk',
  'Yázigi',
  'Wise Up',
  'CNA',
  'SkillHero',
  'Microlins',
  'SUPERA',
  'Sistema Positivo de Ensino',
] as const

export type FranchiseNetwork = (typeof FRANCHISE_NETWORKS)[number]
