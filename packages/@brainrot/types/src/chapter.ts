export interface Chapter {
  number: number;
  title: string;
  content: string;
  originalContent?: string;
  slug?: string;
  wordCount?: number;
  translationNotes?: string;
  status?: 'draft' | 'translated' | 'reviewed' | 'published';
  createdAt?: Date;
  updatedAt?: Date;
}