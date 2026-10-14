import { config } from '@fortawesome/fontawesome-svg-core'

import { DEFAULT_ICON_PROPS } from '../../components/__fixtures__/default-icon-props'
import { FontAwesomeIconProps } from '../../types/icon-props'
import { IS_VERSION_7_OR_LATER } from '../constants'
import { getClassListFromProps } from '../get-class-list-from-props'

/**
 * Benchmarks for `getClassListFromProps`. Run with `npm run bench`.
 *
 * Each scenario calls the function in timed batches and reports the median
 * time per call. The headline is the geometric mean of the scenario medians,
 * so dividing two runs' headlines gives the geometric mean of the per-scenario
 * speedups between them.
 */

const WARMUP_MS = 250
const SAMPLE_MS = 10
const SAMPLES = 40

type Scenario = {
  name: string
  inputs: FontAwesomeIconProps[]
  expected: string[][]
  cssPrefix?: string
}

type Result = {
  name: string
  medianNs: number
  spread: number
}

// Merge user props over the defaults the way FontAwesomeIcon does, so every
// scenario sees the same object shapes the component produces.
const asIconProps = (props: Partial<FontAwesomeIconProps>) =>
  ({
    ...DEFAULT_ICON_PROPS,
    icon: 'coffee',
    ...props,
  }) as FontAwesomeIconProps

const prefixed = (prefix: string, classes: string[]) =>
  IS_VERSION_7_OR_LATER
    ? classes.map((cls) => cls.replace(/^fa-/, `${prefix}-`))
    : classes

const v7Only = (classes: string[]) => (IS_VERSION_7_OR_LATER ? classes : [])

const PLAIN = { props: {}, expected: [] }

const STYLED = {
  props: { size: 'lg', fixedWidth: true, className: 'nav-icon' },
  expected: ['nav-icon', 'fa-fw', 'fa-lg'],
} as const

const ANIMATED = {
  props: {
    spin: true,
    pull: 'left',
    rotation: 90,
    flip: 'both',
    className: 'a b c',
  },
  expected: [
    'a',
    'b',
    'c',
    'fa-spin',
    'fa-flip-horizontal',
    'fa-flip-vertical',
    'fa-rotate-90',
    'fa-pull-left',
  ],
} as const

const EVERYTHING = {
  props: {
    beat: true,
    fade: true,
    beatFade: true,
    bounce: true,
    shake: true,
    spin: true,
    spinPulse: true,
    spinReverse: true,
    pulse: true,
    fixedWidth: true,
    inverse: true,
    border: true,
    flip: true,
    size: '2x',
    rotation: 180,
    pull: 'right',
    swapOpacity: true,
    rotateBy: true,
    widthAuto: true,
    canvasSquare: true,
    canvasRoomy: true,
    flip360: true,
    buzz: true,
    float: true,
    jello: true,
    spinSnap: true,
    spinSnap4: true,
    spinSnap8: true,
    swing: true,
    wag: true,
  },
  expected: [
    'fa-beat',
    'fa-fade',
    'fa-beat-fade',
    'fa-bounce',
    'fa-shake',
    'fa-spin',
    'fa-spin-reverse',
    'fa-spin-pulse',
    'fa-pulse',
    'fa-fw',
    'fa-inverse',
    'fa-border',
    'fa-flip',
    'fa-2x',
    'fa-rotate-180',
    'fa-pull-right',
    'fa-swap-opacity',
    ...v7Only([
      'fa-rotate-by',
      'fa-width-auto',
      'fa-canvas-square',
      'fa-canvas-roomy',
      'fa-flip-360',
      'fa-buzz',
      'fa-float',
      'fa-jello',
      'fa-spin-snap',
      'fa-spin-snap-4',
      'fa-spin-snap-8',
      'fa-swing',
      'fa-wag',
    ]),
  ],
} as const

/**
 * About 1,000 icons: 80% plain, 15% styled, 5% animated. A minority also pass
 * props the component forwards to the `<svg>` (`color`, `style`, `onClick`),
 * which land at the end of the merged object and give the page its mix of
 * object shapes.
 */
const pageMixKind = (index: number) => {
  const slot = index % 20
  if (slot === 0) return ANIMATED
  if (slot <= 3) return STYLED
  return PLAIN
}

const buildPageMix = () => {
  const inputs: FontAwesomeIconProps[] = []
  const expected: string[][] = []

  for (let index = 0; index < 1000; index++) {
    const kind = pageMixKind(index)
    const forwarded = {
      ...(index % 7 === 0 && { color: 'tomato' }),
      ...(index % 11 === 0 && { style: { marginRight: 4 } }),
      ...(index % 13 === 0 && { onClick: () => {} }),
    }
    inputs.push(asIconProps({ ...kind.props, ...forwarded }))
    expected.push([...kind.expected])
  }

  return { inputs, expected }
}

const SCENARIOS: Scenario[] = [
  {
    name: 'plain',
    inputs: [asIconProps(PLAIN.props)],
    expected: [PLAIN.expected],
  },
  {
    name: 'styled',
    inputs: [asIconProps(STYLED.props)],
    expected: [[...STYLED.expected]],
  },
  {
    name: 'animated',
    inputs: [asIconProps(ANIMATED.props)],
    expected: [[...ANIMATED.expected]],
  },
  {
    name: 'everything',
    inputs: [asIconProps(EVERYTHING.props)],
    expected: [[...EVERYTHING.expected]],
  },
  {
    name: 'custom prefix',
    cssPrefix: 'custom',
    inputs: [asIconProps(STYLED.props), asIconProps(ANIMATED.props)],
    expected: [
      prefixed('custom', [...STYLED.expected]),
      prefixed('custom', [...ANIMATED.expected]),
    ],
  },
  { name: 'page mix', ...buildPageMix() },
]

// Results feed this sink so V8 cannot drop the calls being measured.
let sink = 0

const runBatch = (inputs: FontAwesomeIconProps[], calls: number) => {
  for (let call = 0; call < calls; call++) {
    sink += getClassListFromProps(inputs[call % inputs.length]).length
  }
}

const measure = ({ name, inputs }: Scenario): Result => {
  // Warm up, and size batches so each sample takes about SAMPLE_MS.
  let calls = 0
  const warmupStart = performance.now()
  while (performance.now() - warmupStart < WARMUP_MS) {
    runBatch(inputs, 1000)
    calls += 1000
  }
  const callsPerSample = Math.max(
    1000,
    Math.round((calls / WARMUP_MS) * SAMPLE_MS),
  )

  const samples: number[] = []
  for (let sample = 0; sample < SAMPLES; sample++) {
    const start = performance.now()
    runBatch(inputs, callsPerSample)
    samples.push(((performance.now() - start) * 1e6) / callsPerSample)
  }

  const sorted = samples.toSorted((a, b) => a - b)
  const medianNs = sorted[Math.floor(sorted.length / 2)]
  const p10 = sorted[Math.floor(sorted.length * 0.1)]
  const p90 = sorted[Math.floor(sorted.length * 0.9)]

  return { name, medianNs, spread: (p90 - p10) / medianNs }
}

const results: Result[] = []

describe('getClassListFromProps benchmarks', () => {
  afterEach(() => {
    config.cssPrefix = ''
  })

  afterAll(() => {
    const headline = Math.exp(
      results.reduce((sum, { medianNs }) => sum + Math.log(medianNs), 0) /
        results.length,
    )
    const rows = results.map(
      ({ name, medianNs, spread }) =>
        `  ${name.padEnd(16)}${medianNs.toFixed(1).padStart(9)} ns/call   ±${(
          (spread * 100) /
          2
        ).toFixed(1)}%`,
    )
    process.stdout.write(
      [
        '',
        'getClassListFromProps (median of samples, ± half the p10–p90 spread)',
        ...rows,
        `  ${'headline'.padEnd(16)}${headline.toFixed(1).padStart(9)} ns/call   (geometric mean)`,
        `  (sink ${sink})`,
        '',
      ].join('\n'),
    )
  })

  test.each(SCENARIOS)('$name', (scenario) => {
    if (scenario.cssPrefix) config.cssPrefix = scenario.cssPrefix

    expect(
      scenario.inputs.map((props) => getClassListFromProps(props)),
    ).toEqual(scenario.expected)

    results.push(measure(scenario))
  })
})
