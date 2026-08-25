/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#121212',
    tint: '#303BFA',

    // Core surfaces
    background: '#EDEBE4',
    foreground: '#121212',

    // Cards / elevated surfaces
    card: '#F2F1EC',
    cardForeground: '#121212',

    // Primary action color (buttons, links, active states)
    primary: '#303BFA',
    primaryForeground: '#ffffff',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#E8E5DC',
    secondaryForeground: '#121212',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#E8E5DC',
    mutedForeground: '#686861',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#E8E5DC',
    accentForeground: '#121212',

    // Destructive actions (delete, error states)
    destructive: '#A32B2B',
    destructiveForeground: '#ffffff',

    // Borders and input outlines
    border: '#C1BEB3',
    input: '#C1BEB3',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 0,
};

export default colors;
