import { useWindowDimensions } from 'react-native';

export const SIDEBAR_WIDTH = 250;

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  return {
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1024,
    isDesktop: width >= 768,
    isWide: width >= 1200,
    width,
    height,
  };
}
