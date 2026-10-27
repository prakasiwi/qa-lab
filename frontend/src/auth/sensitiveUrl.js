export function captureQueryParams(searchParams, names) {
  return Object.fromEntries(
    names.map((name) => [name, searchParams.get(name) || ""]),
  );
}

export function scrubQueryParams(location, history, sensitiveNames) {
  const searchParams = new URLSearchParams(location.search);
  sensitiveNames.forEach((name) => searchParams.delete(name));
  const search = searchParams.toString();
  const scrubbedUrl = `${location.pathname}${search ? `?${search}` : ""}${location.hash}`;
  history.replaceState(history.state, "", scrubbedUrl);
}
