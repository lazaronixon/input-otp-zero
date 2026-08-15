import { defineElements } from "./elements/index"

export { default as InputOtpElement } from "./elements/input_otp_element"
export { computeSlots } from "./input/slots"
export { REGEXP_ONLY_CHARS, REGEXP_ONLY_DIGITS, REGEXP_ONLY_DIGITS_AND_CHARS, resolvePattern } from "./patterns"
export { defineElements }

defineElements()
