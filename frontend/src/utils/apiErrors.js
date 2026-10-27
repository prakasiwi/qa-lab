export function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

export function isForbiddenError(error) {
  return error?.response?.status === 403;
}
