export const NAME_INPUT_CONSTRAINTS = Object.freeze({
  minLength: 2,
  maxLength: 100,
});
export const PASSWORD_INPUT_CONSTRAINTS = Object.freeze({
  minLength: 12,
  maxLength: 128,
  pattern: "(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{12,128}",
  title:
    "Use 12 to 128 characters with uppercase, lowercase, number, and symbol.",
});
