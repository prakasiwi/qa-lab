export function shouldInvalidateAuth(error) {
  return (
    error?.response?.status === 401 &&
    error?.config?.skipAuthInvalidation !== true
  );
}
