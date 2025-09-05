export type MoodScore = 1 | 2 | 3 | 4 | 5;

export interface MoodEntry {
  id: string;
  user_id: string;
  company_id: string;
  project_id?: string;
  mood_score: MoodScore;
  note?: string;
  entry_date: string;
}

export interface AggregatedMood {
  date: string;
  avg_mood: number;
}


export const moodEmojis: Record<number, string> = {
  1: '😢',
  2: '😐',
  3: '🙂',
  4: '😄',
  5: '🤩',
};