import InputOtpElement from "./input_otp_element"
import InputOtpSlotElement from "./input_otp_slot"
import { InputOtpCaretElement, InputOtpCharElement, InputOtpGroupElement, InputOtpSeparatorElement } from "./parts"

const ELEMENTS = {
  // The parts come first so that a component upgrading in the same pass finds
  // slots that already know how to paint themselves.
  "input-otp-group": InputOtpGroupElement,
  "input-otp-slot": InputOtpSlotElement,
  "input-otp-char": InputOtpCharElement,
  "input-otp-caret": InputOtpCaretElement,
  "input-otp-separator": InputOtpSeparatorElement,

  "input-otp": InputOtpElement
}

export function defineElements() {
  Object.entries(ELEMENTS).forEach(([ name, element ]) => {
    if (!customElements.get(name)) customElements.define(name, element)
  })
}
