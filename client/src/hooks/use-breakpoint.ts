import { useWindowDimensions } from "react-native";

import { Breakpoints } from "@/constants/theme";

export interface BreakpointInfo {
  /** Current viewport width in points */
  width: number;
  /** Below `md`: phone layout, navigation lives in a drawer */
  isCompact: boolean;
  /** At or above `md`: the sidebar is persistent */
  isExpanded: boolean;
  /** At or above `lg`: room for the widest grids */
  isWide: boolean;
  /** Columns for the list grid, derived from the width */
  gridColumns: number;
}

/**
 * Resolves the current layout breakpoint.
 *
 * React Native has no media queries, so layout decisions are made in JS from the
 * window size. `useWindowDimensions` re-renders on resize and on orientation
 * change, which covers both browser resizing and rotating a tablet.
 */
export function useBreakpoint(): BreakpointInfo {
  const { width } = useWindowDimensions();

  const isExpanded = width >= Breakpoints.md;
  const isWide = width >= Breakpoints.lg;

  return {
    width,
    isCompact: !isExpanded,
    isExpanded,
    isWide,
    gridColumns: isWide ? 3 : isExpanded ? 2 : 1,
  };
}
