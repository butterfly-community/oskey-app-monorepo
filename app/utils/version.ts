function parseVersion(version: string): number[] {
  return version.split('.').map(part => {
    const num = parseInt(part, 10);
    return isNaN(num) ? 0 : num;
  });
}

export function compareVersions(version1: string, version2: string): number {
  const v1Parts = parseVersion(version1);
  const v2Parts = parseVersion(version2);
  
  const maxLength = Math.max(v1Parts.length, v2Parts.length);
  
  for (let i = 0; i < maxLength; i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;
    
    if (v1Part > v2Part) {
      return 1;
    }
    if (v1Part < v2Part) {
      return -1;
    }
  }
  
  return 0;
}

export function isVersionCompatible(currentVersion: string, minimumVersion: string): boolean {
  return compareVersions(currentVersion, minimumVersion) >= 0;
}

export function getVersionUpgradeMessage(currentVersion: string, minimumVersion: string): string {
  return `Current firmware version ${currentVersion} is too low, please upgrade to ${minimumVersion} or higher.`;
}