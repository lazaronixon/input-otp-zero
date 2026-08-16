import { describe, expect, test, vi } from "vitest"
import { ListenerBin } from "src/helpers/listener_helper"

describe("ListenerBin", () => {
  test("attaches a listener to the target", () => {
    const bin = new ListenerBin()
    const target = document.createElement("div")
    const listener = vi.fn()

    bin.listen(target, "click", listener)
    target.dispatchEvent(new Event("click"))

    expect(listener).toHaveBeenCalledTimes(1)
  })

  test("removes every listener on dispose", () => {
    const bin = new ListenerBin()
    const target = document.createElement("div")
    const clicked = vi.fn()
    const focused = vi.fn()
    bin.listen(target, "click", clicked)
    bin.listen(target, "focus", focused)

    bin.dispose()
    target.dispatchEvent(new Event("click"))
    target.dispatchEvent(new Event("focus"))

    expect(clicked).not.toHaveBeenCalled()
    expect(focused).not.toHaveBeenCalled()
  })

  // A capturing listener is only removed by a matching capturing removal, so
  // the options have to be carried through to `removeEventListener`.
  test("removes a capturing listener with the same options", () => {
    const bin = new ListenerBin()
    const listener = vi.fn()
    bin.listen(document, "selectionchange", listener, { capture: true })

    bin.dispose()
    document.dispatchEvent(new Event("selectionchange"))

    expect(listener).not.toHaveBeenCalled()
  })

  test("runs teardowns registered with track", () => {
    const bin = new ListenerBin()
    const teardown = vi.fn()
    bin.track(teardown)

    bin.dispose()

    expect(teardown).toHaveBeenCalledTimes(1)
  })

  test("runs teardowns in reverse order of registration", () => {
    const bin = new ListenerBin()
    const order = []
    bin.track(() => order.push("first"))
    bin.track(() => order.push("second"))

    bin.dispose()

    expect(order).toEqual([ "second", "first" ])
  })

  test("disposing twice runs each teardown once", () => {
    const bin = new ListenerBin()
    const teardown = vi.fn()
    bin.track(teardown)

    bin.dispose()
    bin.dispose()

    expect(teardown).toHaveBeenCalledTimes(1)
  })
})
