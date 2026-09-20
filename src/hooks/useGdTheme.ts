import { useTheme } from '@/components/ThemeProvider';

export function useGdTheme() {
  const { theme } = useTheme();
  return theme === 'lavender';
}
