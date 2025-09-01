/**
 * @brainrot/templates
 * Publishing templates for EPUB, PDF, and Kindle formats
 */

import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync, existsSync } from "fs";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get the absolute path to a template file
 * @param {string} type - Template type: 'epub', 'pdf-paperback', 'pdf-hardcover', 'kindle', 'legal-copyright', 'legal-title-page', 'legal-ai-disclosure', 'legal-toc'
 * @returns {string} Absolute path to the template file
 */
export function getTemplatePath(type) {
  const templates = {
    epub: join(__dirname, "epub", "brainrot.epub.template"),
    "epub-css": join(__dirname, "epub", "brainrot-style.css"),
    "pdf-paperback": join(__dirname, "pdf", "paperback.latex"),
    "pdf-hardcover": join(__dirname, "pdf", "hardcover.latex"),
    kindle: join(__dirname, "kindle", "kindle.template"),
    "cover-svg": join(__dirname, "covers", "cover-template.svg"),
    "legal-copyright": join(__dirname, "legal", "copyright.md"),
    "legal-title-page": join(__dirname, "legal", "title-page.md"),
    "legal-ai-disclosure": join(__dirname, "legal", "ai-disclosure.md"),
    "legal-toc": join(__dirname, "legal", "toc.md"),
  };

  if (!templates[type]) {
    throw new Error(
      `Unknown template type: ${type}. Valid types are: ${Object.keys(templates).join(", ")}`,
    );
  }

  return templates[type];
}

/**
 * Read a template file and return its contents
 * @param {string} type - Template type
 * @param {string} [version] - Optional version (git tag) to read from
 * @returns {string} Template contents
 */
export function readTemplate(type, version = null) {
  if (version) {
    return readTemplateVersion(type, version);
  }
  const path = getTemplatePath(type);
  return readFileSync(path, "utf8");
}

// === TEMPLATE VERSION CONTROL SYSTEM ===

/**
 * Get available legal template versions from git tags
 * @returns {string[]} Array of available versions
 */
export function getLegalTemplateVersions() {
  try {
    const tags = execSync('git tag --list "legal-templates-v*"', { 
      encoding: 'utf8', 
      cwd: __dirname 
    }).trim();
    
    if (!tags) return [];
    
    return tags.split('\n')
      .filter(tag => tag.startsWith('legal-templates-v'))
      .sort((a, b) => {
        // Sort by version number (descending - newest first)
        const aVersion = a.replace('legal-templates-v', '');
        const bVersion = b.replace('legal-templates-v', '');
        return bVersion.localeCompare(aVersion, undefined, { numeric: true });
      });
  } catch (error) {
    console.warn('Warning: Could not retrieve template versions:', error.message);
    return [];
  }
}

/**
 * Get the current legal template version
 * @returns {string} Current version or 'latest'
 */
export function getCurrentLegalTemplateVersion() {
  try {
    // Check if there's a version override file
    const versionOverridePath = join(__dirname, '.template-version');
    if (existsSync(versionOverridePath)) {
      return readFileSync(versionOverridePath, 'utf8').trim();
    }
    
    // Default to latest
    return 'latest';
  } catch (error) {
    return 'latest';
  }
}

/**
 * Read a template from a specific version (git tag)
 * @param {string} type - Template type
 * @param {string} version - Version tag (e.g., 'legal-templates-v1.0.0')
 * @returns {string} Template contents
 */
export function readTemplateVersion(type, version) {
  if (!type.startsWith('legal-')) {
    throw new Error(`Version selection only supported for legal templates, got: ${type}`);
  }
  
  try {
    // Get the template file path relative to repo root
    const templateFile = getTemplatePath(type).replace(__dirname + '/', '');
    const repoRelativePath = `packages/@brainrot/templates/${templateFile}`;
    
    const content = execSync(`git show ${version}:${repoRelativePath}`, { 
      encoding: 'utf8', 
      cwd: join(__dirname, '../../../') // Go to repo root
    });
    
    return content;
  } catch (error) {
    throw new Error(`Failed to read template ${type} from version ${version}: ${error.message}`);
  }
}

/**
 * Set the legal template version to use (creates override file)
 * @param {string} version - Version tag or 'latest'
 */
export function setLegalTemplateVersion(version) {
  const versionOverridePath = join(__dirname, '.template-version');
  
  if (version === 'latest') {
    // Remove override file to use latest
    if (existsSync(versionOverridePath)) {
      execSync(`rm "${versionOverridePath}"`);
    }
  } else {
    // Verify version exists
    const availableVersions = getLegalTemplateVersions();
    if (!availableVersions.includes(version)) {
      throw new Error(`Version ${version} not found. Available versions: ${availableVersions.join(', ')}`);
    }
    
    // Write override file
    execSync(`echo "${version}" > "${versionOverridePath}"`, { cwd: __dirname });
  }
}

/**
 * Create a new legal template version tag
 * @param {string} version - Version string (e.g., '1.1.0')
 * @param {string} [message] - Optional tag message
 */
export function tagLegalTemplateVersion(version, message = null) {
  const tagName = `legal-templates-v${version}`;
  const tagMessage = message || `Legal templates version ${version}`;
  
  try {
    execSync(`git tag -a "${tagName}" -m "${tagMessage}"`, { cwd: __dirname });
    return tagName;
  } catch (error) {
    throw new Error(`Failed to create version tag ${tagName}: ${error.message}`);
  }
}

/**
 * Rollback to a previous legal template version
 * @param {string} version - Version to rollback to
 * @returns {string} Version that was set
 */
export function rollbackLegalTemplates(version) {
  setLegalTemplateVersion(version);
  return version;
}

/**
 * Get color scheme for a book
 * @param {string} bookSlug - Book identifier (e.g., 'great-gatsby')
 * @returns {Object} Color scheme with primary, secondary, and accent colors
 */
export function getColorScheme(bookSlug) {
  const schemesPath = join(__dirname, "covers", "color-schemes.json");
  const schemes = JSON.parse(readFileSync(schemesPath, "utf8"));

  const slug = bookSlug.replace("the-", "");
  return schemes.schemes[slug] || schemes.schemes.default;
}

/**
 * Get emoji for a book cover
 * @param {string} bookSlug - Book identifier
 * @returns {string} Emoji character
 */
export function getCoverEmoji(bookSlug) {
  const schemesPath = join(__dirname, "covers", "color-schemes.json");
  const schemes = JSON.parse(readFileSync(schemesPath, "utf8"));

  const slug = bookSlug.replace("the-", "");
  return schemes.emojis[slug] || schemes.emojis.default;
}

/**
 * Replace template variables with actual values
 * @param {string} template - Template string with {{VARIABLE}} placeholders
 * @param {Object} values - Object with variable values
 * @returns {string} Processed template
 */
export function processTemplate(template, values) {
  let processed = template;

  // Replace all {{VARIABLE}} placeholders
  for (const [key, value] of Object.entries(values)) {
    const regex = new RegExp(`{{${key}}}`, "g");
    processed = processed.replace(regex, value || "");
  }

  // Pandoc-style variables for LaTeX
  for (const [key, value] of Object.entries(values)) {
    const regex = new RegExp(`\\$${key}\\$`, "g");
    processed = processed.replace(regex, value || "");
  }

  // Handle conditional sections $if(variable)$ ... $endif$
  processed = processed.replace(
    /\$if\(([^)]+)\)\$([\s\S]*?)\$endif\$/g,
    (match, variable, content) => {
      const varName = variable.trim();
      return values[varName] ? content : "";
    },
  );

  return processed;
}

/**
 * Generate a cover SVG for a book
 * @param {Object} metadata - Book metadata
 * @returns {string} Processed SVG content
 */
export function generateCover(metadata) {
  const template = readTemplate("cover-svg");
  const colorScheme = getColorScheme(metadata.slug || "default");
  const emoji = getCoverEmoji(metadata.slug || "default");

  // Prepare title lines (split long titles)
  const titleWords = (metadata.title || "").split(" ");
  let titleLine1 = "";
  let titleLine2 = "";

  if (titleWords.length > 3) {
    const midpoint = Math.ceil(titleWords.length / 2);
    titleLine1 = titleWords.slice(0, midpoint).join(" ");
    titleLine2 = titleWords.slice(midpoint).join(" ");
  } else {
    titleLine1 = metadata.title;
  }

  const values = {
    COLOR_PRIMARY: colorScheme.primary,
    COLOR_SECONDARY: colorScheme.secondary,
    TITLE_LINE_1: titleLine1.toUpperCase(),
    TITLE_LINE_2: titleLine2.toUpperCase(),
    TITLE_SIZE: titleLine2 ? "120" : "150",
    SUBTITLE: metadata.subtitle || metadata.shortDescription || "",
    GENRE: metadata.genre || "CLASSIC LITERATURE",
    EMOJI: emoji,
    AUTHOR: metadata.author || "",
    TRANSLATOR: metadata.translator || "Brainrot Translator",
  };

  return processTemplate(template, values);
}

/**
 * Generate combined legal pages for book publication
 * @param {Object} metadata - Book metadata with legal information
 * @returns {string} Combined legal pages markdown content
 */
export function generateLegalPages(metadata, version = null) {
  // Get the version to use (parameter, override file, or latest)
  const useVersion = version || getCurrentLegalTemplateVersion();
  const versionTag = useVersion === 'latest' ? null : useVersion;
  
  // Prepare comprehensive metadata values for legal templates
  const currentYear = new Date().getFullYear();
  const legalValues = {
    TITLE: metadata.title || "",
    SUBTITLE: metadata.subtitle || "",
    AUTHOR: metadata.author || "",
    TRANSLATOR: metadata.translator || "Brainrot Publishing House",
    ORIGINAL_TITLE: metadata.originalTitle || metadata.title || "",
    ORIGINAL_AUTHOR: metadata.originalAuthor || metadata.author || "",
    ORIGINAL_YEAR: metadata.originalYear || "Unknown",
    YEAR: metadata.year || currentYear.toString(),
    PUBLISH_DATE: metadata.publishDate || new Date().toISOString().split('T')[0],
    ISBN: metadata.isbn || "TBD",
    FORMAT: metadata.format || "Digital Edition",
    // Add version info for tracking
    TEMPLATE_VERSION: versionTag || 'latest',
    // Chapter list for table of contents (if provided)
    CHAPTER_LIST: metadata.chapters ? 
      metadata.chapters.map((chapter, index) => 
        `**Chapter ${index + 1}: ${chapter.title || chapter.name || `Chapter ${index + 1}`}** ............... ${chapter.page || 'TBD'}`
      ).join('\n') : 
      "{{CHAPTERS_TO_BE_GENERATED}}",
    // Page numbers for back matter
    AUTHOR_PAGE: metadata.authorPage || "TBD",
    TRANSLATOR_PAGE: metadata.translatorPage || "TBD", 
    PUBLISHER_PAGE: metadata.publisherPage || "TBD",
    CATALOG_PAGE: metadata.catalogPage || "TBD",
  };

  // Legal templates in publication order
  const legalTemplateOrder = [
    "legal-title-page",
    "legal-copyright", 
    "legal-ai-disclosure",
    "legal-toc"
  ];

  let combinedContent = "";

  // Add version comment at the start
  if (versionTag) {
    combinedContent += `<!-- Generated using legal templates ${versionTag} -->\n\n`;
  }

  // Process each legal template and combine
  for (let i = 0; i < legalTemplateOrder.length; i++) {
    const templateType = legalTemplateOrder[i];
    
    try {
      const template = readTemplate(templateType, versionTag);
      const processedTemplate = processTemplate(template, legalValues);
      
      // Add the processed template
      combinedContent += processedTemplate;
      
      // Add page break between sections (except for the last one)
      if (i < legalTemplateOrder.length - 1) {
        combinedContent += "\n\n\\newpage\n\n";
      }
    } catch (error) {
      // If a template is missing or errors, add a placeholder
      console.warn(`Warning: Could not process legal template '${templateType}' (version: ${versionTag || 'latest'}): ${error.message}`);
      combinedContent += `\n<!-- Legal template '${templateType}' could not be processed -->\n\n`;
    }
  }

  return combinedContent;
}

// Export all functions
export default {
  getTemplatePath,
  readTemplate,
  getColorScheme,
  getCoverEmoji,
  processTemplate,
  generateCover,
  generateLegalPages,
  // Version control functions
  getLegalTemplateVersions,
  getCurrentLegalTemplateVersion,
  readTemplateVersion,
  setLegalTemplateVersion,
  tagLegalTemplateVersion,
  rollbackLegalTemplates,
};
