/**
 * Document Section Extraction Utility
 * 
 * Parses HTML documents and extracts heading elements to build
 * a navigable table of contents with section hierarchy.
 */

export interface DocumentSection {
  id: string;
  title: string;
  level: number; // 1 = h1, 2 = h2, etc.
  offsetTop: number;
  element?: HTMLElement;
}

export interface ExtractSectionsOptions {
  /** Heading levels to include (default: [1, 2, 3, 4]) */
  levels?: number[];
  /** Prefix for generated IDs (default: 'section') */
  idPrefix?: string;
  /** Whether to assign IDs to elements (default: true) */
  assignIds?: boolean;
}

/**
 * Extract document sections from an HTML container element.
 * This should be called after the content is rendered in the DOM.
 */
export function extractDocumentSections(
  container: HTMLElement,
  options: ExtractSectionsOptions = {}
): DocumentSection[] {
  const {
    levels = [1, 2, 3, 4],
    idPrefix = 'section',
    assignIds = true,
  } = options;

  const sections: DocumentSection[] = [];
  const selector = levels.map(l => `h${l}`).join(', ');
  const headings = container.querySelectorAll(selector);

  headings.forEach((heading, index) => {
    const element = heading as HTMLElement;
    const level = parseInt(element.tagName[1]);
    const id = `${idPrefix}-${index}`;

    // Assign ID to element for scroll targeting
    if (assignIds && !element.id) {
      element.id = id;
    }

    const title = element.textContent?.trim() || `Section ${index + 1}`;

    sections.push({
      id: element.id || id,
      title,
      level,
      offsetTop: element.offsetTop,
      element,
    });
  });

  return sections;
}

/**
 * Parse HTML string and extract sections without DOM.
 * Useful for server-side processing or preview.
 */
export function extractSectionsFromHtml(html: string): Omit<DocumentSection, 'offsetTop' | 'element'>[] {
  const sections: Omit<DocumentSection, 'offsetTop' | 'element'>[] = [];
  
  // Match heading tags h1-h4
  const headingRegex = /<h([1-4])[^>]*>([^<]*)<\/h\1>/gi;
  let match;
  let index = 0;

  while ((match = headingRegex.exec(html)) !== null) {
    const level = parseInt(match[1]);
    const title = match[2].trim() || `Section ${index + 1}`;

    sections.push({
      id: `section-${index}`,
      title,
      level,
    });

    index++;
  }

  return sections;
}

/**
 * Build a hierarchical tree structure from flat sections.
 */
export interface SectionTreeNode extends DocumentSection {
  children: SectionTreeNode[];
}

export function buildSectionTree(sections: DocumentSection[]): SectionTreeNode[] {
  const root: SectionTreeNode[] = [];
  const stack: SectionTreeNode[] = [];

  sections.forEach(section => {
    const node: SectionTreeNode = { ...section, children: [] };

    // Find parent based on level
    while (stack.length > 0 && stack[stack.length - 1].level >= section.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      root.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }

    stack.push(node);
  });

  return root;
}

/**
 * Find the active section based on scroll position.
 */
export function findActiveSection(
  sections: DocumentSection[],
  scrollTop: number,
  offset: number = 100
): DocumentSection | null {
  if (sections.length === 0) return null;

  // Find the last section that's above the current scroll position
  for (let i = sections.length - 1; i >= 0; i--) {
    if (sections[i].offsetTop <= scrollTop + offset) {
      return sections[i];
    }
  }

  return sections[0];
}

/**
 * Smooth scroll to a section by ID.
 */
export function scrollToSection(
  container: HTMLElement,
  sectionId: string,
  offset: number = 20
): void {
  const element = document.getElementById(sectionId);
  if (!element) return;

  const targetTop = element.offsetTop - offset;
  
  container.scrollTo({
    top: targetTop,
    behavior: 'smooth',
  });
}

/**
 * Calculate scroll progress through the document.
 */
export function calculateScrollProgress(
  container: HTMLElement
): number {
  const scrollTop = container.scrollTop;
  const scrollHeight = container.scrollHeight - container.clientHeight;
  
  if (scrollHeight <= 0) return 100;
  
  return Math.min(100, Math.round((scrollTop / scrollHeight) * 100));
}
