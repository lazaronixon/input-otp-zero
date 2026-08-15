import { describe, expect, test } from "vitest"
import {
  REGEXP_ONLY_CHARS,
  REGEXP_ONLY_DIGITS,
  REGEXP_ONLY_DIGITS_AND_CHARS,
  resolvePattern
} from "src/patterns"

describe("resolvePattern", () => {
  test("returns null when there is no pattern", () => {
    expect(resolvePattern(null)).toBeNull()
    expect(resolvePattern(undefined)).toBeNull()
    expect(resolvePattern("")).toBeNull()
  })

  test("passes a regular expression through untouched", () => {
    const pattern = /^[abc]+$/

    expect(resolvePattern(pattern)).toBe(pattern)
  })

  test("expands the named aliases", () => {
    expect(resolvePattern("digits").source).toBe(REGEXP_ONLY_DIGITS)
    expect(resolvePattern("chars").source).toBe(REGEXP_ONLY_CHARS)
    expect(resolvePattern("digits-and-chars").source).toBe(REGEXP_ONLY_DIGITS_AND_CHARS)
  })

  test("compiles a raw source string", () => {
    const pattern = resolvePattern("^[0-9]{2}$")

    expect(pattern.test("42")).toBe(true)
    expect(pattern.test("4")).toBe(false)
  })

  test("the digits alias accepts digits only", () => {
    const pattern = resolvePattern("digits")

    expect(pattern.test("123456")).toBe(true)
    expect(pattern.test("12a")).toBe(false)
    expect(pattern.test("")).toBe(false)
  })
})
