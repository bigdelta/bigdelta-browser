const stripWww = (hostname: string): string => hostname.toLowerCase().replace(/^www\./, '');

const isSelfReferral = (referringHostname: string, currentHostname: string | undefined): boolean => {
  if (!currentHostname) {
    return false;
  }

  return stripWww(referringHostname) === stripWww(currentHostname);
};

export const parseReferringDomain = (referrer: string | undefined, currentHostname?: string): string | undefined => {
  if (!referrer) {
    return undefined;
  }

  try {
    const referringHostname = new URL(referrer).hostname;

    return isSelfReferral(referringHostname, currentHostname) ? undefined : referringHostname;
  } catch (e) {
    return undefined;
  }
};
