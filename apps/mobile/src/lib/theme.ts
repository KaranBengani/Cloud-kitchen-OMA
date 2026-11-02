// Colours from the approved Stitch designs (docs/design/v2, DECISIONS.md D15): rust red for actions,
// mustard highlights, brown text on warm cream. Sizes are large on purpose: the main users are
// parents in their 50s using the app in a busy kitchen, so every target is at least 48dp tall.
export const colors = {
  primary: '#A93611', // rust: primary buttons, active tab, totals
  onPrimary: '#FFFFFF',
  accent: '#F2C35E', // mustard: today, selected chips
  accentSoft: '#FCE9BE',
  background: '#FFF6F1',
  surface: '#FFFFFF',
  tint: '#FDEBE2', // peach: chips, inner boxes, keypad keys
  text: '#3B1D0B',
  muted: '#7A5E4E',
  border: '#F1DDD2',
  danger: '#B3261E',
  dangerSoft: '#FDE2DE',
  success: '#1E7B34',
  successSoft: '#DDF3E0',
  whatsapp: '#1E9E50', // darker than WhatsApp's own green so white text stays readable
  disabled: '#B9A79C',
};

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const font = { small: 14, label: 16, body: 18, title: 22, heading: 26, huge: 32 };
export const radius = { sm: 10, md: 14, lg: 20, pill: 999 };
export const minTouch = 48;

// Android's built-in serif (Noto Serif) for headings, matching the designs without bundling fonts.
// Devanagari falls back to Noto Sans Devanagari automatically.
export const serif = 'serif';
