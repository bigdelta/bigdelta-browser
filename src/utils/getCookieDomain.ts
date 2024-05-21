import Cookies from 'js-cookie';
import { FullConfig } from '../model/config';

export const getCookieDomain = (config: FullConfig): string => {
  if (config.cookieDomain) {
    return config.cookieDomain;
  }

  if (typeof document === 'undefined') {
    return null;
  }

  const randomCookieName = Math.random().toString(36).substring(3, 12);
  const hostname = document.location.hostname.split('.');

  for (let i = hostname.length - 1; i >= 0; i--) {
    const cookieDomain = `.${hostname.slice(i).join('.')}`;
    const options = { domain: cookieDomain, path: '/' };
    Cookies.set(randomCookieName, 'cookie', options);

    if (document.cookie.indexOf(randomCookieName) > -1) {
      Cookies.remove(randomCookieName, options);

      return cookieDomain;
    }
  }

  return null;
};
