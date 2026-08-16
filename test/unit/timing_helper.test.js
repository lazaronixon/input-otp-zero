import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { clearTimeouts, syncTimeouts } from "src/helpers/timing_helper"

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe("syncTimeouts", () => {
  test("runs the callback three times over the first 50ms", () => {
    const callback = vi.fn()

    syncTimeouts(callback)

    vi.advanceTimersByTime(0)
    expect(callback).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(10)
    expect(callback).toHaveBeenCalledTimes(2)

    vi.advanceTimersByTime(40)
    expect(callback).toHaveBeenCalledTimes(3)
  })

  test("hands back every timeout so they can be cancelled", () => {
    const timeouts = syncTimeouts(() => {})

    expect(timeouts).toHaveLength(3)
  })
})

describe("clearTimeouts", () => {
  test("cancels callbacks that have not run yet", () => {
    const callback = vi.fn()
    const timeouts = syncTimeouts(callback)

    clearTimeouts(timeouts)
    vi.advanceTimersByTime(100)

    expect(callback).not.toHaveBeenCalled()
  })

  // Emptied in place rather than reassigned, so the caller's own reference to
  // the array stops pointing at timeouts that no longer exist.
  test("empties the array in place", () => {
    const timeouts = syncTimeouts(() => {})

    clearTimeouts(timeouts)

    expect(timeouts).toHaveLength(0)
  })

  test("leaves callbacks that already ran alone", () => {
    const callback = vi.fn()
    const timeouts = syncTimeouts(callback)
    vi.advanceTimersByTime(100)

    clearTimeouts(timeouts)

    expect(callback).toHaveBeenCalledTimes(3)
  })
})
