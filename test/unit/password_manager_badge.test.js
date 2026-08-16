import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import PasswordManagerBadge, { BADGE_SPACE_WIDTH } from "src/input/password_manager_badge"

const BADGE_MARGIN_RIGHT = 18

let element
let badge
let onChange
let overflows

beforeEach(() => {
  vi.useFakeTimers()

  // jsdom computes `overflow-x` as an empty string rather than `visible`, which
  // would read as "this element clips" and stop the walk at the first step.
  overflows = new Map()
  vi.spyOn(globalThis, "getComputedStyle").mockImplementation(target =>
    ({ overflowX: overflows.get(target) ?? "visible" }))

  document.body.innerHTML = "<div id=\"host\"></div>"
  element = document.getElementById("host")
  onChange = vi.fn()
  badge = new PasswordManagerBadge(element, onChange)

  // jsdom has no layout, so the geometry the badge measures has to be supplied.
  layOut({ left: 0, right: 300, top: 0, width: 300, height: 50 })
  viewportWidth(1000)
})

afterEach(() => {
  badge.stop()
  document.body.innerHTML = ""
  vi.restoreAllMocks()
  vi.useRealTimers()
})

function layOut({ left, right, top, width, height }) {
  element.getBoundingClientRect = () => ({ left, right, top, width, height, bottom: top + height })
  Object.defineProperty(element, "offsetWidth", { value: width, configurable: true })
  Object.defineProperty(element, "offsetHeight", { value: height, configurable: true })
}

function viewportWidth(width) {
  Object.defineProperty(document.documentElement, "clientWidth", { value: width, configurable: true })
}

function plantBadge() {
  const marker = document.createElement("div")
  marker.setAttribute("data-lastpass-icon-root", "")
  document.body.appendChild(marker)
}

// The corner probe is the fallback when no known extension marker is present.
function elementAtCornerIs(target) {
  document.elementFromPoint = vi.fn(() => target)
}

describe("strategies", () => {
  test("does nothing at all when pushing is turned off", () => {
    plantBadge()

    badge.start("none")
    badge.trackWhileFocused()
    vi.advanceTimersByTime(10_000)

    expect(badge.willPush).toBe(false)
    expect(onChange).not.toHaveBeenCalled()
  })

  test("pushes once a badge is found and the gutter fits", () => {
    plantBadge()
    badge.start("increase-width")

    badge.trackWhileFocused()
    vi.advanceTimersByTime(0)

    expect(badge.willPush).toBe(true)
    expect(onChange).toHaveBeenCalled()
  })

  test("exposes the gutter width the input is widened by", () => {
    expect(BADGE_SPACE_WIDTH).toBe("40px")
  })
})

describe("detecting", () => {
  test("recognises a known extension marker", () => {
    plantBadge()
    // Would report "no badge" if the marker were not taken as proof.
    elementAtCornerIs(element)
    badge.start("increase-width")

    badge.trackWhileFocused()
    vi.advanceTimersByTime(0)

    expect(badge.willPush).toBe(true)
  })

  // Without a known marker, something overlapping the field's top-right corner
  // is the only signal that a badge is there.
  test("probes the corner when no marker is present", () => {
    elementAtCornerIs(document.createElement("span"))
    badge.start("increase-width")

    badge.trackWhileFocused()
    vi.advanceTimersByTime(0)

    expect(badge.willPush).toBe(true)
  })

  test("probes the corner where a badge would sit", () => {
    elementAtCornerIs(element)
    badge.start("increase-width")

    badge.trackWhileFocused()
    vi.advanceTimersByTime(0)

    expect(document.elementFromPoint).toHaveBeenCalledWith(300 - BADGE_MARGIN_RIGHT, 25)
  })

  test("reads the field itself at the corner as no badge", () => {
    elementAtCornerIs(element)
    badge.start("increase-width")

    badge.trackWhileFocused()
    vi.advanceTimersByTime(6000)

    expect(badge.willPush).toBe(false)
  })

  // Badges are injected asynchronously, and only once the field matters to the
  // extension — so one look on focus is not enough.
  test("keeps looking for a few seconds after focus", () => {
    elementAtCornerIs(element)
    badge.start("increase-width")
    badge.trackWhileFocused()
    vi.advanceTimersByTime(0)
    expect(badge.willPush).toBe(false)

    plantBadge()
    vi.advanceTimersByTime(2000)

    expect(badge.willPush).toBe(true)
  })

  test("stops looking once it has given up", () => {
    elementAtCornerIs(element)
    badge.start("increase-width")
    badge.trackWhileFocused()
    vi.advanceTimersByTime(6000)

    plantBadge()
    vi.advanceTimersByTime(10_000)

    expect(badge.willPush).toBe(false)
  })

  test("settles on the first badge it finds", () => {
    plantBadge()
    badge.start("increase-width")

    badge.trackWhileFocused()
    vi.advanceTimersByTime(6000)

    expect(onChange).toHaveBeenCalledTimes(1)
  })
})

describe("measuring the gutter", () => {
  test("stays put when the gutter does not fit", () => {
    plantBadge()
    // Only 20px to the right of the field, and the gutter needs 40.
    viewportWidth(320)
    badge.start("increase-width")

    badge.trackWhileFocused()
    vi.advanceTimersByTime(0)

    expect(badge.willPush).toBe(false)
  })

  // The gutter has to fit inside whatever box clips horizontal overflow, or the
  // overhang turns into a scrollbar and shifts the layout.
  test("measures against a clipping ancestor rather than the viewport", () => {
    document.body.innerHTML = "<div id=\"card\"><div id=\"host\"></div></div>"
    element = document.getElementById("host")
    const card = document.getElementById("card")
    badge = new PasswordManagerBadge(element, onChange)

    layOut({ left: 0, right: 300, top: 0, width: 300, height: 50 })
    viewportWidth(1000)
    // Shrink-wrapped around the field: only 10px to spare, and the gutter needs 40.
    card.getBoundingClientRect = () => ({ left: 0, right: 310, top: 0, width: 310, height: 50, bottom: 50 })
    Object.defineProperty(card, "clientWidth", { value: 310, configurable: true })
    overflows.set(card, "auto")

    plantBadge()
    badge.start("increase-width")
    badge.trackWhileFocused()
    vi.advanceTimersByTime(0)

    expect(badge.willPush).toBe(false)
  })

  test("re-measures as the layout changes", () => {
    plantBadge()
    viewportWidth(320)
    badge.start("increase-width")
    badge.trackWhileFocused()
    vi.advanceTimersByTime(0)
    expect(badge.willPush).toBe(false)

    viewportWidth(1000)
    vi.advanceTimersByTime(1000)

    expect(badge.willPush).toBe(true)
  })

  test("gives the space back when the room disappears", () => {
    plantBadge()
    badge.start("increase-width")
    badge.trackWhileFocused()
    vi.advanceTimersByTime(0)
    expect(badge.willPush).toBe(true)

    viewportWidth(320)
    vi.advanceTimersByTime(1000)

    expect(badge.willPush).toBe(false)
  })
})

describe("stop", () => {
  test("stops re-measuring", () => {
    plantBadge()
    viewportWidth(320)
    badge.start("increase-width")

    badge.stop()
    viewportWidth(1000)
    vi.advanceTimersByTime(5000)

    expect(badge.willPush).toBe(false)
  })

  test("cancels a detection that has not run yet", () => {
    elementAtCornerIs(element)
    badge.start("increase-width")
    badge.trackWhileFocused()

    badge.stopTracking()
    plantBadge()
    vi.advanceTimersByTime(6000)

    expect(badge.willPush).toBe(false)
  })
})
