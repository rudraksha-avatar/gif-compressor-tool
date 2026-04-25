import type { AppRoute } from './types';

export const KNOWN_ROUTES: AppRoute[] = [
  '/',
  '/mp4-to-gif',
  '/gif-to-mp4',
  '/gif-resizer',
  '/gif-crop',
  '/gif-speed',
  '/gif-split',
  '/gif-maker',
  '/gif-optimizer',
  '/tools',
  '/privacy',
  '/about',
  '/contact',
  '/faq',
  '/404.html'
];

export function resolveRoute(pathname: string): AppRoute | null {
  return KNOWN_ROUTES.includes(pathname as AppRoute) ? (pathname as AppRoute) : null;
}
