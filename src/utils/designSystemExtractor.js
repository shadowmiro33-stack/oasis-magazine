export const DESIGN_SYSTEM_EXTRACTION_GUIDE = `You are a senior product designer and design system architect.
Analyze the uploaded UI screen and extract a complete design system from it.
Your task is NOT to describe the UI, but to reconstruct a reusable, scalable design system based on it.

Follow the instructions strictly:

1. Design Tokens Extraction
- Colors (primary, secondary, neutral, semantic)
- Typography (font family, size, weight, line-height)
- Spacing scale (4/8px system if applicable)
- Border radius
- Shadow styles
- Opacity usage

2. Component System
Identify and define reusable components:
- Buttons (type, size, state)
- Cards
- Navigation (top bar, tabs, etc.)
- Input fields
- List items
- Tags / chips
- Any recurring UI pattern

For each component, include:
- Name
- Variants
- States (default, hover, active, disabled)
- Structure (hierarchy)

3. Layout System
- Grid system (columns, margins, gutters)
- Layout rules (padding patterns, alignment logic)
- Responsive assumptions if inferable

4. Interaction Patterns
- Tap / click behaviors
- Scroll patterns
- Navigation transitions

5. Visual Style Principles
Summarize the design philosophy in 3-5 keywords.

6. Output Format (STRICT)
Return only valid JSON structured like this:
{
  "design_tokens": {
    "colors": {
      "primary": [],
      "secondary": [],
      "neutral": [],
      "semantic": []
    },
    "typography": {},
    "spacing": [],
    "border_radius": [],
    "shadows": [],
    "opacity": []
  },
  "components": [
    {
      "name": "",
      "variants": [],
      "states": [],
      "structure": []
    }
  ],
  "layout": {
    "grid": "",
    "rules": [],
    "responsive_assumptions": []
  },
  "interactions": [],
  "style_principles": []
}

Important Rules:
- Do not guess randomly. Infer based on visible patterns only.
- If uncertain, mark the value or note as "assumed".
- Make it reusable for real product design systems, like Figma variables or design tokens.
- Do not include markdown, code fences, comments, or explanatory text outside JSON.`;

export const GEMINI_FREE_TIER_MODEL = 'gemini-2.5-flash-lite';

const HEX_PATTERN = /#(?:[0-9a-fA-F]{3}){1,2}\b/;

const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

const parseJsonSafely = (value) => {
  if (!value || typeof value !== 'string') return null;
  const withoutFence = value
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');

  try {
    return JSON.parse(withoutFence);
  } catch {
    const start = withoutFence.indexOf('{');
    const end = withoutFence.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(withoutFence.slice(start, end + 1));
    }
    throw new Error('JSON 형식으로 파싱할 수 없습니다.');
  }
};

export const parseDesignSystemJson = (text) => parseJsonSafely(text);

export const buildDesignSystemPrompt = (preset) => {
  const presetContext = preset
    ? `\n\nReference preset context. Use it only as supporting context when no image is visible:\n${JSON.stringify(preset)}`
    : '';

  return `${DESIGN_SYSTEM_EXTRACTION_GUIDE}${presetContext}`;
};

const extractHex = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value.match(HEX_PATTERN)?.[0] || null;
  if (typeof value === 'number') return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractHex(item);
      if (found) return found;
    }
    return null;
  }
  if (isObject(value)) {
    for (const key of ['value', 'hex', 'color', 'token']) {
      const found = extractHex(value[key]);
      if (found) return found;
    }
    for (const item of Object.values(value)) {
      const found = extractHex(item);
      if (found) return found;
    }
  }
  return null;
};

const findByKey = (value, keyWords, extractor) => {
  if (!value) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findByKey(item, keyWords, extractor);
      if (found) return found;
    }
    return null;
  }
  if (!isObject(value)) return null;

  for (const [key, child] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase().replace(/[\s_-]/g, '');
    if (keyWords.some((word) => normalizedKey.includes(word))) {
      const found = extractor(child);
      if (found !== null && found !== undefined && found !== '') return found;
    }
  }

  for (const child of Object.values(value)) {
    const found = findByKey(child, keyWords, extractor);
    if (found !== null && found !== undefined && found !== '') return found;
  }

  return null;
};

const extractNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const match = value.match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractNumber(item);
      if (found !== null) return found;
    }
    return null;
  }
  if (isObject(value)) {
    for (const key of ['value', 'radius', 'size']) {
      const found = extractNumber(value[key]);
      if (found !== null) return found;
    }
    for (const item of Object.values(value)) {
      const found = extractNumber(item);
      if (found !== null) return found;
    }
  }
  return null;
};

const extractFont = (value) => {
  if (!value) return null;
  if (typeof value === 'string') {
    if (HEX_PATTERN.test(value)) return null;
    return value;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractFont(item);
      if (found) return found;
    }
    return null;
  }
  if (isObject(value)) {
    for (const key of ['font_family', 'fontFamily', 'family', 'value', 'font']) {
      const found = extractFont(value[key]);
      if (found) return found;
    }
    for (const item of Object.values(value)) {
      const found = extractFont(item);
      if (found) return found;
    }
  }
  return null;
};

export const normalizeExtractedTokens = (extraction, fallbackTokens) => {
  const source = extraction || {};
  const designTokens = source.design_tokens || source.designTokens || {};
  const colors = designTokens.colors || source.colors || {};
  const typography = designTokens.typography || source.typography || {};
  const radiusSource = designTokens.border_radius || designTokens.borderRadius || source.border_radius || source.radius;

  const next = {
    primary: extractHex(source.primary) || findByKey(colors, ['primary', 'brand'], extractHex) || fallbackTokens.primary,
    secondary: extractHex(source.secondary) || findByKey(colors, ['secondary', 'accent'], extractHex) || fallbackTokens.secondary,
    surface: extractHex(source.surface) || findByKey(colors, ['surface', 'background', 'card', 'neutral'], extractHex) || fallbackTokens.surface,
    radius: extractNumber(source.radius) ?? findByKey(radiusSource, ['radius', 'border'], extractNumber) ?? fallbackTokens.radius,
    font: extractFont(source.font) || findByKey(typography, ['fontfamily', 'family', 'font'], extractFont) || fallbackTokens.font,
  };

  return {
    ...next,
    radius: Number.isFinite(Number(next.radius)) ? Number(next.radius) : fallbackTokens.radius,
  };
};

export const createPresetDesignSystemExtraction = (preset) => ({
  design_tokens: {
    colors: {
      primary: [{ name: 'color.primary.500', value: preset.primary, usage: 'primary actions and active states', confidence: 'assumed' }],
      secondary: [{ name: 'color.secondary.500', value: preset.secondary, usage: 'secondary emphasis and support UI', confidence: 'assumed' }],
      neutral: [
        { name: 'color.surface.default', value: preset.surface, usage: 'cards and page surfaces', confidence: 'assumed' },
        { name: 'color.neutral.border', value: '#e2e8f0', usage: 'dividers and outlines', confidence: 'assumed' },
      ],
      semantic: [
        { name: 'color.success.500', value: '#10b981', usage: 'success status', confidence: 'assumed' },
        { name: 'color.danger.500', value: '#ef4444', usage: 'error status', confidence: 'assumed' },
      ],
    },
    typography: {
      font_family: { value: preset.font, confidence: 'assumed' },
      scale: [
        { name: 'heading.md', size: '20px', weight: 800, line_height: 1.3, confidence: 'assumed' },
        { name: 'body.sm', size: '14px', weight: 500, line_height: 1.6, confidence: 'assumed' },
        { name: 'caption', size: '12px', weight: 700, line_height: 1.4, confidence: 'assumed' },
      ],
    },
    spacing: ['4px', '8px', '12px', '16px', '20px', '24px', '32px'],
    border_radius: [{ name: 'radius.default', value: `${preset.radius}px`, confidence: 'assumed' }],
    shadows: [{ name: 'shadow.card', value: '0 4px 6px -1px rgba(0,0,0,0.1)', confidence: 'assumed' }],
    opacity: [{ name: 'opacity.disabled', value: 0.6, confidence: 'assumed' }],
  },
  components: [
    {
      name: 'Button',
      variants: ['primary', 'secondary outline', 'ghost'],
      states: ['default', 'hover', 'active', 'disabled'],
      structure: ['container', 'optional leading icon', 'label'],
      confidence: 'assumed',
    },
    {
      name: 'Card',
      variants: ['default', 'data card'],
      states: ['default', 'hover'],
      structure: ['surface', 'title', 'content', 'optional status badges'],
      confidence: 'assumed',
    },
  ],
  layout: {
    grid: 'Two-column admin layout with fixed sidebar and responsive content area',
    rules: ['Use 20-40px section gaps', 'Align form labels above controls', 'Keep action buttons near their related content'],
    responsive_assumptions: ['Collapse two-column grids to one column on narrow screens'],
  },
  interactions: ['Buttons lift slightly on hover', 'Inputs show focused border and soft focus ring', 'Tabs switch content in place'],
  style_principles: ['structured', 'admin-focused', 'token-driven', 'clear hierarchy'],
});
