import { BookMetadata } from './metadata';
import { Chapter } from './chapter';

export interface Book {
  slug: string;
  title: string;
  originalTitle?: string;
  author: string;
  translator?: string;
  metadata: BookMetadata;
  chapters: Chapter[];
  description?: string;
  coverImage?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  completionStatus?: 'draft' | 'in-progress' | 'complete';
  createdAt?: Date;
  updatedAt?: Date;
}