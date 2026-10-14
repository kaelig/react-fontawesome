import React, { useMemo } from 'react'

import {
  config as faConfig,
  findIconDefinition,
  icon as faIcon,
  parse as faParse,
} from '@fortawesome/fontawesome-svg-core'

import { makeReactConverter } from '../converter'
import { useAccessibilityId } from '../hooks/useAccessibilityId'
import { Logger } from '../logger'
import { FontAwesomeIconProps } from '../types/icon-props'
import { getClassListFromProps } from '../utils/get-class-list-from-props'
import { normalizeIconArgs } from '../utils/normalize-icon-args'
import { typedObjectKeys } from '../utils/typed-object-keys'

const logger = new Logger('FontAwesomeIcon')

const DEFAULT_PROPS = {
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

const DEFAULT_PROP_KEYS = new Set(Object.keys(DEFAULT_PROPS))

function resolveDefinition(lookup: ReturnType<typeof normalizeIconArgs>) {
  if (!lookup || 'icon' in lookup) return lookup
  return findIconDefinition(lookup)
}

/**
 * React Component for rendering Font Awesome icons.
 *
 * @function FontAwesomeIcon
 * @param props - The properties for the FontAwesomeIcon component, including icon definition and styling options.
 * @returns A React element representing the Font Awesome icon, or null if the icon cannot be rendered.
 */
export const FontAwesomeIcon = React.forwardRef<
  SVGSVGElement,
  FontAwesomeIconProps
>((props, ref): React.JSX.Element | null => {
  const allProps: FontAwesomeIconProps = { ...DEFAULT_PROPS, ...props }

  const {
    icon: iconArgs,
    mask: maskArgs,
    symbol,
    title,
    titleId: titleIdFromProps,
    maskId: maskIdFromProps,
    transform,
  } = allProps

  const maskId = useAccessibilityId(maskIdFromProps, Boolean(maskArgs))
  const titleId = useAccessibilityId(titleIdFromProps, Boolean(title))

  const iconLookup = normalizeIconArgs(iconArgs)
  const maskLookup = normalizeIconArgs(maskArgs)
  const classList = getClassListFromProps(allProps)
  const classes = classList.join(' ')

  // Building the SVG description is most of an icon's render cost, so reuse
  // it until something it depends on changes. That includes the definitions
  // the icon and mask resolve to (a name lookup resolves once library.add()
  // registers it) and the svg-core config values icon() reads. The result's
  // `abstract` getter rebuilds the description on every read, so cache the
  // description itself, not the result.
  const iconDefinition = resolveDefinition(iconLookup)
  const maskDefinition = resolveDefinition(maskLookup)
  const {
    cssPrefix,
    familyPrefix,
    replacementClass,
    familyDefault,
    styleDefault,
    showMissingIcons,
  } = faConfig
  const abstract = useMemo(
    () => {
      if (!iconLookup) return null
      const transformProps =
        typeof transform === 'string' ? faParse.transform(transform) : transform
      return faIcon(iconLookup, {
        ...(classList.length > 0 && { classes: classList }),
        ...(transformProps && { transform: transformProps }),
        ...(maskLookup && { mask: maskLookup }),
        symbol,
        title,
        titleId,
        maskId,
      })?.abstract
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on values, not on the lookup objects and class array rebuilt every render
    [
      iconDefinition,
      maskDefinition,
      classes,
      transform,
      symbol,
      title,
      titleId,
      maskId,
      cssPrefix,
      familyPrefix,
      replacementClass,
      familyDefault,
      styleDefault,
      showMissingIcons,
    ],
  )

  if (!iconLookup) {
    logger.error('Icon lookup is undefined', iconArgs)
    return null
  }

  if (!abstract) {
    logger.error('Could not find icon', iconLookup)
    return null
  }

  const extraProps: Omit<
    React.SVGAttributes<SVGSVGElement>,
    'children' | 'mask' | 'transform'
  > &
    React.RefAttributes<SVGSVGElement> = { ref }

  for (const key of typedObjectKeys(allProps)) {
    // Skip default props
    if (DEFAULT_PROP_KEYS.has(key)) {
      continue
    }

    // Add all other props to the extraProps object
    // @ts-expect-error since `key` can be any of the keys in FontAwesomeIconProps,
    // TypeScript widens the type of the `obj[key]` lookups to a union of all possible values,
    // which will not correctly overlap each other.
    extraProps[key] = allProps[key]
  }

  return makeReactConverter(abstract[0], extraProps)
})

FontAwesomeIcon.displayName = 'FontAwesomeIcon'
