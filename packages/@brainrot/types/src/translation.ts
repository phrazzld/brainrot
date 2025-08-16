export interface TranslationFile {
  path: string;
  content: string;
  type: 'markdown' | 'text' | 'html';
}

export interface TranslationChapter {
  id: string;
  number: number;
  title: string;
  originalTitle?: string;
  content?: string;
  file?: TranslationFile;
}

export interface Translation {
  id: string;
  slug: string;
  title: string;
  author: string;
  description: string;
  chapters: TranslationChapter[];
  coverImage?: string;
  publishedDate?: string;
  lastUpdated?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  tags?: string[];
  featured?: boolean;
  available?: boolean;
}