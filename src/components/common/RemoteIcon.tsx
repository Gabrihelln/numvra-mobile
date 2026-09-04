import React, { useEffect, useState } from 'react';
import { Image } from 'react-native';
import { SvgUri } from 'react-native-svg';

interface RemoteIconProps {
  uri?: string;
  size: number;
  fallback: React.ReactElement;
}

const isRemoteUri = (uri?: string) => Boolean(uri && /^https?:\/\//i.test(uri));

/** Identifies SVG URLs, including URLs with query strings used by CDN providers. */
export const isSvgIconUri = (uri?: string) => Boolean(
  uri && (uri.startsWith('data:image/svg+xml') || /\.svg(?:[?#]|$)/i.test(uri)),
);

/**
 * Renders remote brand assets while selecting the native renderer required by
 * the asset type. React Native's Image does not render remote SVG documents.
 */
export const RemoteIcon: React.FC<RemoteIconProps> = ({ uri, size, fallback }) => {
  const [failedUri, setFailedUri] = useState<string | undefined>();

  useEffect(() => {
    setFailedUri(undefined);
  }, [uri]);

  if (!isRemoteUri(uri) || failedUri === uri) {
    return fallback;
  }

  if (isSvgIconUri(uri)) {
    return (
      <SvgUri
        uri={uri ?? null}
        width={size}
        height={size}
        onError={() => setFailedUri(uri)}
        fallback={fallback}
      />
    );
  }

  return (
    <Image
      source={{ uri }}
      style={{ width: size, height: size }}
      resizeMode="contain"
      onError={() => setFailedUri(uri)}
    />
  );
};
