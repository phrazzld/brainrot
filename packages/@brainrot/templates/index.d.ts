// Type definitions for @brainrot/templates
export interface TemplateMetadata {
  title?: string;
  subtitle?: string;
  author?: string;
  translator?: string;
  originalTitle?: string;
  originalAuthor?: string;
  originalYear?: string;
  year?: string;
  publishDate?: string;
  isbn?: string;
  format?: string;
  chapters?: Array<{
    title?: string;
    name?: string;
    page?: string;
  }>;
  authorPage?: string;
  translatorPage?: string;
  publisherPage?: string;
  catalogPage?: string;
}

export function getTemplatePath(type: string): string;
export function readTemplate(type: string, version?: string | null): string;
export function getColorScheme(bookSlug: string): any;
export function getCoverEmoji(bookSlug: string): string;
export function processTemplate(template: string, values: Record<string, any>): string;
export function generateCover(bookSlug: string): string;
export function generateLegalPages(metadata: TemplateMetadata, version?: string | null): string;

// Version control functions
export function getLegalTemplateVersions(): string[];
export function getCurrentLegalTemplateVersion(): string;
export function readTemplateVersion(type: string, version: string): string;
export function setLegalTemplateVersion(version: string): void;
export function tagLegalTemplateVersion(version: string, message?: string): string;
export function rollbackLegalTemplates(version: string): string;

declare const _default: {
  getTemplatePath: typeof getTemplatePath;
  readTemplate: typeof readTemplate;
  getColorScheme: typeof getColorScheme;
  getCoverEmoji: typeof getCoverEmoji;
  processTemplate: typeof processTemplate;
  generateCover: typeof generateCover;
  generateLegalPages: typeof generateLegalPages;
  getLegalTemplateVersions: typeof getLegalTemplateVersions;
  getCurrentLegalTemplateVersion: typeof getCurrentLegalTemplateVersion;
  readTemplateVersion: typeof readTemplateVersion;
  setLegalTemplateVersion: typeof setLegalTemplateVersion;
  tagLegalTemplateVersion: typeof tagLegalTemplateVersion;
  rollbackLegalTemplates: typeof rollbackLegalTemplates;
};

export default _default;