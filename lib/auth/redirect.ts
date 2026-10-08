const APP_PATHS = ['/today', '/week', '/goals', '/review', '/dashboard', '/habits', '/notes', '/settings'];

/** Limit post-login navigation to application paths on this origin. */
export function safeNextPath(value: string | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return '/today';
  }

  try {
    const url = new URL(value, 'http://localhost');
    if (url.origin !== 'http://localhost') return '/today';
    if (!APP_PATHS.some((path) => url.pathname === path || url.pathname.startsWith(`${path}/`))) {
      return '/today';
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return '/today';
  }
}
