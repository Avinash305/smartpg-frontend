import React, { useEffect, useRef } from 'react';

/**
 * Google AdSense placeholder component.
 *
 * Usage:
 * <AdPlaceholder slot="1234567890" style={{ minHeight: 90 }} />
 *
 * Configure publisher ID via .env:
 * VITE_GOOGLE_ADS_CLIENT=ca-pub-XXXXXXXXXXXXXX
 */
export default function AdPlaceholder({
  slot,
  client,
  format = 'auto',
  fullWidthResponsive = true,
  className = '',
  style = {},
//   adTest = false, // set true to enable test ads during development
  adTest = import.meta.env.DEV, // default to test ads in development
}) {
  const insRef = useRef(null);
  const clientId = client || import.meta.env.VITE_GOOGLE_ADS_CLIENT || 'ca-pub-XXXX';

  useEffect(() => {
    // Avoid pushing multiple times on the same element
    // Re-push when slot/client changes
    try {
      if (window && 'adsbygoogle' in window) {
        // eslint-disable-next-line no-undef
        (adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (e) {
      // Silently ignore in dev or when blocked
      // console.debug('AdSense push error', e);
    }
  }, [slot, clientId]);

  if (!slot) {
    return null;
  }

  const mergedStyle = {
    display: 'block',
    minHeight: 60,
    ...style,
  };

  return (
    <ins
      ref={insRef}
      className={`adsbygoogle ${className}`.trim()}
      style={mergedStyle}
      data-ad-client={clientId}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={fullWidthResponsive ? 'true' : 'false'}
      data-adtest={adTest ? 'on' : undefined}
    />
  );
}
