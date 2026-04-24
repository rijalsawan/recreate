export function isTabletUserAgent(userAgent: string): boolean {
  return /(ipad|tablet|kindle|silk|playbook|sm-t|tab|android(?!.*mobile))/i.test(userAgent);
}

export function isPhoneUserAgent(userAgent: string): boolean {
  if (!userAgent || isTabletUserAgent(userAgent)) return false;
  return /(iphone|ipod|android.*mobile|windows phone|blackberry|bb10|opera mini|mobile)/i.test(userAgent);
}

export function isRestrictedDeviceUserAgent(userAgent: string): boolean {
  return isPhoneUserAgent(userAgent) || isTabletUserAgent(userAgent);
}
