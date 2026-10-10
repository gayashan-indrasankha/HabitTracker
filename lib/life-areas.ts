export const LIFE_AREAS = [
  'Fitness',
  'Personal Development',
  'Education & Skills',
  'Career',
  'Emotional Well-bein',
  'Fun',
] as const;

const legacyAreas: Record<string, string> = {
  University: 'Education & Skills',
  Univerisity: 'Education & Skills',
  'Career & Business': 'Career',
  'Industry Project': 'Career',
  'Interview Preparation': 'Career',
  'Health & Fitness': 'Fitness',
  'Mental & Emotional Well-being': 'Emotional Well-bein',
  'Fun & Recreation': 'Fun',
  Communication: 'Personal Development',
  Reading: 'Education & Skills',
  'Sleep & Recovery': 'Fitness',
};

export function normalizeLifeArea(area: string): string {
  return legacyAreas[area] ?? area;
}
