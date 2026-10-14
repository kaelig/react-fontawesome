import { FontAwesomeIconProps } from '../../types/icon-props'

/**
 * Mirrors `DEFAULT_PROPS` in `FontAwesomeIcon.tsx`, which the component merges
 * under user props before calling `getClassListFromProps`. Keep the key order
 * in sync so tests and benchmarks see the same object shape as the component.
 */
export const DEFAULT_ICON_PROPS = {
  border: false,
  className: '',
  mask: undefined,
  maskId: undefined,
  fixedWidth: false,
  inverse: false,
  flip: false,
  icon: undefined,
  listItem: false,
  pull: undefined,
  pulse: false,
  rotation: undefined,
  rotateBy: false,
  size: undefined,
  spin: false,
  spinPulse: false,
  spinReverse: false,
  beat: false,
  fade: false,
  beatFade: false,
  bounce: false,
  shake: false,
  symbol: false,
  title: '',
  titleId: undefined,
  transform: undefined,
  swapOpacity: false,
  widthAuto: false,
  canvasSquare: false,
  canvasRoomy: false,
  flip360: false,
  buzz: false,
  float: false,
  jello: false,
  spinSnap: false,
  spinSnap4: false,
  spinSnap8: false,
  swing: false,
  wag: false,
} as const satisfies Partial<FontAwesomeIconProps>
