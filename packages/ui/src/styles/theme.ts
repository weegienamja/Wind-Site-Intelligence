export interface WindSiteTheme {
  primary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  error: string;
  warning: string;
  success: string;
}

export const DEFAULT_THEME: WindSiteTheme = {
  primary: '#0f172a',
  accent: '#22c55e',
  background: '#ffffff',
  surface: '#f8fafc',
  text: '#0f172a',
  textSecondary: '#64748b',
  border: '#e2e8f0',
  error: '#ef4444',
  warning: '#f59e0b',
  success: '#22c55e',
};

export function themeToCSS(theme: Partial<WindSiteTheme>): Record<string, string> {
  const merged = { ...DEFAULT_THEME, ...theme };
  return {
    '--wsi-primary': merged.primary,
    '--wsi-accent': merged.accent,
    '--wsi-background': merged.background,
    '--wsi-surface': merged.surface,
    '--wsi-text': merged.text,
    '--wsi-text-secondary': merged.textSecondary,
    '--wsi-border': merged.border,
    '--wsi-error': merged.error,
    '--wsi-warning': merged.warning,
    '--wsi-success': merged.success,
  };
}
