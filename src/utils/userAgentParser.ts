declare global {
  interface Window {
    MSStream: any;
  }
  interface Navigator {
    userAgentData: any;
  }
}

export const getBrowserWithVersion = (userAgent: string) => {
  let name = 'Unknown';
  let version = 'Unknown';

  try {
    if (/Opera|OPR\//.test(userAgent)) {
      name = 'Opera';
      version = userAgent.match(/Opera\/(\d+\.\d+)|OPR\/(\d+\.\d+)/)[1];
    } else if (/Edg\//.test(userAgent)) {
      name = 'Microsoft Edge (Chromium)';
      version = userAgent.match(/Edg\/(\d+\.\d+)/)[1];
    } else if (/Edge\//.test(userAgent)) {
      name = 'Microsoft Edge (Legacy)';
      version = userAgent.match(/Edge\/(\d+\.\d+)/)[1];
    } else if (/Chrome/.test(userAgent) && !/OPR|Edg\//.test(userAgent)) {
      name = 'Google Chrome';
      version = userAgent.match(/Chrome\/(\d+\.\d+)/)[1];
    } else if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent)) {
      name = 'Apple Safari';
      version = userAgent.match(/Version\/(\d+\.\d+)/)[1];
    } else if (/Firefox/.test(userAgent)) {
      name = 'Mozilla Firefox';
      version = userAgent.match(/Firefox\/(\d+\.\d+)/)[1];
    } else if (/MSIE|Trident/.test(userAgent)) {
      name = 'Microsoft Internet Explorer';
      version = userAgent.match(/MSIE (\d+\.\d+);|rv:(\d+\.\d+)/)[1];
    } else if (/SamsungBrowser/.test(userAgent)) {
      name = 'Samsung Internet';
      version = userAgent.match(/SamsungBrowser\/(\d+\.\d+)/)[1];
    } else if (/CriOS/.test(userAgent)) {
      name = 'Chrome on iOS';
      version = userAgent.match(/CriOS\/(\d+\.\d+)/)[1];
    } else if (/FxiOS/.test(userAgent)) {
      name = 'Firefox on iOS';
      version = userAgent.match(/FxiOS\/(\d+\.\d+)/)[1];
    }
  } catch {}

  return {
    name,
    version,
  };
};

export const getOperatingSystem = async (userAgent: string) => {
  let osName = 'Unknown';

  try {
    if (/Windows NT/.test(userAgent)) {
      let version = ""
      try {
        version = userAgent.match(/Windows NT (\d+\.\d+)/)[1];
      } catch {
      }
      if (version === '10.0') {
        if (navigator.userAgentData) {
          try {
            const uaData = await navigator.userAgentData.getHighEntropyValues(['platformVersion']);
            const platformVersion = uaData.platformVersion;
            const majorVersion = parseInt(platformVersion.split('.')[0], 10);
            if (majorVersion >= 13) {
              osName = 'Windows 11';
            } else {
              osName = 'Windows 10';
            }
          } catch (error) {
            osName = 'Windows 10 or 11';
          }
        } else {
          osName = 'Windows 10 or 11';
        }
      } else if (version === '6.3') osName = 'Windows 8.1';
      else if (version === '6.2') osName = 'Windows 8';
      else if (version === '6.1') osName = 'Windows 7';
      else if (version === '6.0') osName = 'Windows Vista';
      else if (version === '5.1') osName = 'Windows XP';
      else osName = 'Windows';
    } else if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
      osName = 'iOS'
      if (/OS (\d+[_\.\d]+)/.test(userAgent)) {
        const matches = userAgent.match(/OS (\d+[_\.\d]+)/)
        if (matches.length >= 1) {
          osName = 'iOS ' + matches[1].replace(/_/g, '.');
        }
      }
    } else if (/Mac OS X/.test(userAgent)) {
      osName = 'Mac OS X'
      if (/Mac OS X (\d+[_\.\d]+)/.test(userAgent)) {
        const matches = userAgent.match(/Mac OS X (\d+[_\.\d]+)/)
        if (matches.length >= 1) {
          osName = 'Mac OS X ' + matches[1].replace(/_/g, '.');
        }
      }
    } else if (/Android/.test(userAgent)) {
      osName = 'Android'
      if (/Android (\d+\.\d+)/.test(userAgent)) {
        const matches = userAgent.match(/Android (\d+\.\d+)/)
        if (matches.length >= 1) {
          osName = 'Android ' + matches[1];
        }
      }
    } else if (/Linux/.test(userAgent)) {
      osName = 'Linux';
    }
  } catch {}

  return osName;
};

export const getDeviceType = (userAgent: string) => {
  if (/Mobi|Android/i.test(userAgent)) {
    return 'Mobile';
  } else if (/Tablet|iPad/i.test(userAgent)) {
    return 'Tablet';
  } else {
    return 'Desktop';
  }
};
