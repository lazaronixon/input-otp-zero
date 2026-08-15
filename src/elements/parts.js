// Registered so they upgrade and match `:defined`, but deliberately empty: they
// are the shape of the markup, not behavior. The slot owns the painting, and
// these exist so a page can style `input-otp-slot` — the lowest specificity a
// selector can have — instead of an attribute.
export class InputOtpGroupElement extends HTMLElement {}

export class InputOtpCharElement extends HTMLElement {}

export class InputOtpCaretElement extends HTMLElement {}

export class InputOtpSeparatorElement extends HTMLElement {}
