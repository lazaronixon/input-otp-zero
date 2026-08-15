export function computeSlots({ value, maxLength, placeholder, selectionStart, selectionEnd, isFocused }) {
  return Array.from({ length: maxLength }, (_unused, index) => {
    const isActive = isFocused &&
      selectionStart !== null &&
      selectionEnd !== null &&
      ((selectionStart === selectionEnd && index === selectionStart) ||
        (index >= selectionStart && index < selectionEnd))

    let char = null
    if (value[index] !== undefined) char = value[index]

    let placeholderChar = null
    if (value.length === 0 && placeholder?.[index] !== undefined) placeholderChar = placeholder[index]

    return { index, char, placeholderChar, isActive, hasFakeCaret: isActive && char === null }
  })
}
