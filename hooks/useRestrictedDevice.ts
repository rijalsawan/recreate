'use client';

import { useEffect, useState } from 'react';
import { isRestrictedDeviceUserAgent } from '@/lib/device-access';

interface RestrictedDeviceState {
  isRestrictedDevice: boolean;
  isDeviceCheckReady: boolean;
}

export function useRestrictedDevice(): RestrictedDeviceState {
  const [isRestrictedDevice, setIsRestrictedDevice] = useState(false);
  const [isDeviceCheckReady, setIsDeviceCheckReady] = useState(false);

  useEffect(() => {
    setIsRestrictedDevice(isRestrictedDeviceUserAgent(window.navigator.userAgent || ''));
    setIsDeviceCheckReady(true);
  }, []);

  return { isRestrictedDevice, isDeviceCheckReady };
}
