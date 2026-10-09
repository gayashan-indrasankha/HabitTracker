export const PRESET_ID = 'personal-life-os';
export const PRESET_VERSION = 2;

export const sectionLabels = {
  university: 'University',
  industry: 'UCSC Industry Project',
  career: 'Software Engineering and DevOps',
  interview: 'Interview preparation',
  english: 'English communication',
  fitness: 'Fitness and recovery',
  nutrition: 'Optional nutrition plan',
  recovery: 'Reading, meditation, sleep and focus',
  review: 'Weekly review',
} as const;
export type Section = keyof typeof sectionLabels;

type Item = { key: string; section: Section; name: string };
export type GoalPreset = Item & {
  area: string;
  description?: string;
  targetValue?: number;
  targetUnit?: string;
};
export type ProjectPreset = Item & { goal: string; type: string };
export type TaskPreset = Item & {
  goal?: string;
  project?: string;
  milestone?: boolean;
  details?: string;
};
export type HabitPreset = Item & {
  category: string;
  schedule: string;
  target: number;
  description?: string;
};
export type BlockPreset = Item & {
  area: string;
  mask: string;
  start: string;
  end: string;
  fixed?: boolean;
  goal?: string;
  project?: string;
};
export type TopicPreset = Item & { category: string; track: 'Shared' | 'SE' | 'DevOps' };
export type MealPreset = Item & { order: number; notes?: string };

export const goals: GoalPreset[] = [
  {
    key: 'university',
    section: 'university',
    area: 'University',
    name: 'Aim for A grades in five subjects',
    description:
      'Replace the five subject placeholders with your real subjects; enter grades only when known.',
  },
  {
    key: 'industry',
    section: 'industry',
    area: 'Industry Project',
    name: 'Complete UCSC Industry Project successfully',
  },
  {
    key: 'se-portfolio',
    section: 'career',
    area: 'Career',
    name: 'Become ready for a Software Engineering internship',
  },
  {
    key: 'devops-portfolio',
    section: 'career',
    area: 'Career',
    name: 'Become ready for a DevOps internship',
  },
  {
    key: 'interviews',
    section: 'interview',
    area: 'Interview Preparation',
    name: 'Prepare for SE and DevOps internship interviews',
  },
  {
    key: 'communication',
    section: 'english',
    area: 'Communication',
    name: 'Speak technical and professional English confidently',
  },
  {
    key: 'body-weight',
    section: 'fitness',
    area: 'Fitness',
    name: 'Plan an eight-month bulk from approximately 70 kg toward 80 kg',
    targetValue: 80,
    targetUnit: 'kg',
    description: '70 kg is a planning baseline, not a measured entry.',
  },
  {
    key: 'nutrition-reference',
    section: 'nutrition',
    area: 'Fitness',
    name: 'Follow an optional nutrition plan',
    description:
      'Approximately 3,207 kcal and 157 g protein are editable daily planning references, not consumed totals.',
  },
  {
    key: 'sleep-recovery',
    section: 'recovery',
    area: 'Sleep & Recovery',
    name: 'Protect sleep, attention and recovery',
  },
];

export const projects: ProjectPreset[] = [
  {
    key: 'industry-project',
    section: 'industry',
    goal: 'industry',
    type: 'UCSC Industry Project',
    name: 'UCSC Industry Project',
  },
  {
    key: 'se-project',
    section: 'career',
    goal: 'se-portfolio',
    type: 'Software Engineering Portfolio',
    name: 'Software Engineering Portfolio Project',
  },
  {
    key: 'devops-project',
    section: 'career',
    goal: 'devops-portfolio',
    type: 'DevOps Portfolio',
    name: 'DevOps Portfolio Project',
  },
];

function milestone(section: Section, project: string, names: string[]): TaskPreset[] {
  return names.map((name, index) => ({
    key: `${project}-milestone-${index + 1}`,
    section,
    project,
    name,
    milestone: true,
  }));
}
export const tasks: TaskPreset[] = [
  ...[
    'Review recent lecture material',
    'Practise active recall',
    'Solve past-paper questions',
    'Record weak topics',
    'Review upcoming assessments',
  ].map((name, index) => ({
    key: `academic-starter-${index + 1}`,
    section: 'university' as const,
    goal: 'university',
    name,
    details: 'Reusable starter suggestion; schedule or edit when relevant.',
  })),
  ...milestone('industry', 'industry-project', [
    'Confirm project scope and requirements',
    'Plan architecture and technical approach',
    'Set up repository and development environment',
    'Deliver core implementation',
    'Test and review deliverables',
    'Prepare documentation',
    'Prepare final demonstration',
  ]),
  ...milestone('career', 'se-project', [
    'Choose project scope',
    'Write requirements and acceptance criteria',
    'Set up Git repository and architecture',
    'Implement first end-to-end feature',
    'Implement necessary validation and security',
    'Add automated tests',
    'Document design decisions',
    'Prepare demonstration and deployment instructions',
    'Practise explaining technical trade-offs',
  ]),
  ...milestone('career', 'devops-project', [
    'Linux and networking fundamentals',
    'Containerize a real application',
    'Implement CI automation',
    'Understand cloud deployment basics',
    'Add Infrastructure-as-Code when appropriate',
    'Set up logging and monitoring',
    'Test failure and recovery behavior',
    'Document architecture and reproducible setup',
    'Prepare a technical demonstration',
  ]),
  ...[
    'Introduce yourself professionally',
    'Explain your university project',
    'Explain an API',
    'Explain Docker',
    'Describe a difficult bug',
    'Explain a technical decision',
    'Describe teamwork',
    'Answer a behavioral interview question',
    'Explain a concept without notes',
    'Practise a technical mock interview',
  ].map((name, index) => ({
    key: `english-prompt-${index + 1}`,
    section: 'english' as const,
    goal: 'communication',
    name,
    details: 'Reusable speaking prompt; no practice result has been recorded.',
  })),
];

export const habits: HabitPreset[] = [
  {
    key: 'academic-recall',
    section: 'university',
    name: 'Academic active recall',
    category: 'University',
    schedule: 'weekly:5',
    target: 20,
  },
  {
    key: 'english-daily',
    section: 'english',
    name: 'English speaking practice (20–30 min)',
    category: 'Communication',
    schedule: 'daily',
    target: 25,
  },
  {
    key: 'gym-4',
    section: 'fitness',
    name: 'Gym session',
    category: 'Fitness',
    schedule: 'custom:0110110',
    target: 16,
  },
  {
    key: 'weigh-in',
    section: 'fitness',
    name: 'Morning weight check reminder',
    category: 'Fitness',
    schedule: 'custom:1010100',
    target: 12,
    description: 'Record an actual weight separately; checking this reminder is not a measurement.',
  },
  {
    key: 'reading',
    section: 'recovery',
    name: 'Read 10 pages daily',
    category: 'Reading',
    schedule: 'daily',
    target: 25,
  },
  {
    key: 'meditation',
    section: 'recovery',
    name: 'Meditate for 10 minutes',
    category: 'Personal Development',
    schedule: 'daily',
    target: 25,
  },
  {
    key: 'sleep-routine',
    section: 'recovery',
    name: 'Sleep routine: 23:00–06:30',
    category: 'Sleep & Recovery',
    schedule: 'daily',
    target: 25,
    description: 'Plan bedtime and wake time; this is not an overnight time block.',
  },
  {
    key: 'phone-shutdown',
    section: 'recovery',
    name: 'Evening phone shutdown by 22:15',
    category: 'Focus',
    schedule: 'daily',
    target: 25,
  },
];

const block = (
  key: string,
  section: Section,
  name: string,
  area: string,
  day: number,
  start: string,
  end: string,
  fixed = false,
  goal?: string,
  project?: string,
): BlockPreset => ({
  key,
  section,
  name,
  area,
  mask: Array.from({ length: 7 }, (_, index) => (index === day ? '1' : '0')).join(''),
  start,
  end,
  fixed,
  goal,
  project,
});
export const blocks: BlockPreset[] = [
  block(
    'lecture-mon',
    'university',
    'University lectures',
    'University',
    0,
    '08:00',
    '18:30',
    true,
    'university',
  ),
  block(
    'lecture-tue',
    'university',
    'University lectures',
    'University',
    1,
    '08:00',
    '15:00',
    true,
    'university',
  ),
  block(
    'recall-mon',
    'university',
    'Same-day lecture recall',
    'University',
    0,
    '20:00',
    '20:30',
    false,
    'university',
  ),
  block(
    'consolidate-tue',
    'university',
    'Lecture consolidation and assignments',
    'University',
    1,
    '19:30',
    '20:45',
    false,
    'university',
  ),
  block(
    'study-wed',
    'university',
    'Subject-focused deep work',
    'University',
    2,
    '08:00',
    '10:00',
    false,
    'university',
  ),
  block(
    'study-thu',
    'university',
    'Subject-focused deep work',
    'University',
    3,
    '08:00',
    '10:00',
    false,
    'university',
  ),
  block(
    'study-fri',
    'university',
    'Weakest subject or rotation',
    'University',
    4,
    '08:00',
    '10:00',
    false,
    'university',
  ),
  block(
    'academic-sat',
    'university',
    'Past-paper practice and consolidation',
    'University',
    5,
    '08:30',
    '10:30',
    false,
    'university',
  ),
  block(
    'weakness-sun',
    'university',
    'Weak-topic revision',
    'University',
    6,
    '09:30',
    '11:00',
    false,
    'university',
  ),
  block(
    'industry-wed',
    'industry',
    'Industry Project work',
    'Industry Project',
    2,
    '13:30',
    '15:00',
    false,
    'industry',
    'industry-project',
  ),
  block(
    'industry-fri',
    'industry',
    'Industry Project work',
    'Industry Project',
    4,
    '14:00',
    '15:30',
    false,
    'industry',
    'industry-project',
  ),
  block(
    'se-practice',
    'career',
    'SE project deep work',
    'Career',
    3,
    '10:30',
    '12:30',
    false,
    'se-portfolio',
    'se-project',
  ),
  block(
    'portfolio-sat',
    'career',
    'SE and DevOps portfolio rotation',
    'Career',
    5,
    '11:00',
    '13:00',
  ),
  block(
    'devops-practice',
    'career',
    'DevOps practical work',
    'Career',
    4,
    '10:30',
    '12:30',
    false,
    'devops-portfolio',
    'devops-project',
  ),
  block(
    'interview-thu',
    'interview',
    'Technical interview practice',
    'Interview Preparation',
    3,
    '14:00',
    '15:00',
    false,
    'interviews',
  ),
  block(
    'interview-sat',
    'interview',
    'Mock interview practice',
    'Interview Preparation',
    5,
    '14:30',
    '15:30',
    false,
    'interviews',
  ),
  block(
    'english-sun',
    'english',
    'Integrated technical and English speaking',
    'Communication',
    6,
    '15:00',
    '16:00',
    false,
    'communication',
  ),
  block('gym-tue', 'fitness', 'Gym training', 'Fitness', 1, '16:30', '18:00', false, 'body-weight'),
  block('gym-wed', 'fitness', 'Gym training', 'Fitness', 2, '16:30', '18:00', false, 'body-weight'),
  block('gym-fri', 'fitness', 'Gym training', 'Fitness', 4, '16:30', '18:00', false, 'body-weight'),
  block('gym-sat', 'fitness', 'Gym training', 'Fitness', 5, '16:30', '18:00', false, 'body-weight'),
  block('weekly-review', 'review', 'Weekly review', 'Personal Development', 6, '08:30', '09:00'),
];

const shared = [
  'Programming fundamentals',
  'OOP',
  'Data structures',
  'SQL and databases',
  'Networking',
  'Operating systems',
  'Git',
  'REST APIs',
  'Testing',
  'Debugging',
];
const se = [
  'Algorithms',
  'Backend implementation',
  'API design',
  'Authentication and authorization',
  'Software architecture fundamentals',
];
const devops = [
  'Linux commands',
  'Docker',
  'CI/CD',
  'Cloud fundamentals',
  'Networking troubleshooting',
  'Monitoring and Infrastructure-as-Code',
];
export const topics: TopicPreset[] = [
  ...shared.map((name, index) => ({
    key: `interview-shared-${index + 1}`,
    section: 'interview' as const,
    category: 'Foundations',
    name,
    track: 'Shared' as const,
  })),
  ...se.map((name, index) => ({
    key: `interview-se-${index + 1}`,
    section: 'interview' as const,
    category: 'Software Engineering',
    name,
    track: 'SE' as const,
  })),
  ...devops.map((name, index) => ({
    key: `interview-devops-${index + 1}`,
    section: 'interview' as const,
    category: 'DevOps',
    name,
    track: 'DevOps' as const,
  })),
];

export const meals: MealPreset[] = [
  'Breakfast',
  'Lunch',
  'Pre-workout meal or snack',
  'Post-workout meal',
  'Dinner',
  'Before-bed milk or optional snack',
].map((name, order) => ({
  key: `meal-${order + 1}`,
  section: 'nutrition',
  name,
  order,
  notes: 'Add foods, portions, preferred time and optional planned macros when known.',
}));

export const presetItems = { goals, projects, tasks, habits, blocks, topics, meals } as const;
