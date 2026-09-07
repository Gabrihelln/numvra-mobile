import type { Asset } from 'react-native-image-picker';
import { auth } from '../config/firebase';
import { api, ApiError } from './api';

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const AVATAR_UPLOAD_PATH = '/api/profile/avatar';

type UploadAvatarResponse = {
  photoURL?: string;
  avatarUrl?: string;
  url?: string;
};

type ApiErrorResponse = UploadAvatarResponse & {
  message?: string;
  error?: string;
};

const getAvatarFileName = (asset: Asset) => {
  if (asset.fileName) return asset.fileName;
  const extension = asset.type?.split('/')[1] || 'jpg';
  return 'avatar.' + (extension === 'jpeg' ? 'jpg' : extension);
};

const withCacheBust = (url: string) => {
  const separator = url.includes('?') ? '&' : '?';
  return url + separator + 'v=' + Date.now();
};

const parseJsonBody = (body: string): ApiErrorResponse => {
  if (!body.trim()) return {};

  try {
    return JSON.parse(body) as ApiErrorResponse;
  } catch {
    return { message: body };
  }
};

export const profileService = {
  async uploadAvatar(asset: Asset): Promise<string> {
    if (!asset.uri) {
      throw new ApiError('Nao foi possivel ler a foto selecionada.', 400);
    }

    if (asset.type && !ALLOWED_AVATAR_TYPES.has(asset.type)) {
      throw new ApiError('Use uma foto JPG, PNG ou WEBP.', 400);
    }

    if (asset.fileSize && asset.fileSize > MAX_AVATAR_SIZE_BYTES) {
      throw new ApiError('A foto deve ter no maximo 5 MB.', 400);
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new ApiError('Faca login novamente para continuar.', 401);
    }

    const endpoint = api.getBaseUrl() + AVATAR_UPLOAD_PATH;
    const token = await currentUser.getIdToken();
    const formData = new FormData();
    formData.append('avatar', {
      uri: asset.uri,
      name: getAvatarFileName(asset),
      type: asset.type || 'image/jpeg',
    } as any);

    console.info('[Numvra Profile Upload] request', {
      endpoint,
      field: 'avatar',
      fileName: getAvatarFileName(asset),
      mimeType: asset.type || 'image/jpeg',
      fileSize: asset.fileSize,
      hasBearerToken: !!token,
    });

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: formData as any,
      });
    } catch (error) {
      console.error('[Numvra Profile Upload] network error', {
        endpoint,
        message: error instanceof Error ? error.message : String(error),
      });
      throw new ApiError('Falha de rede ao enviar foto de perfil para ' + endpoint + '.', 0);
    }

    const responseBody = await response.text();
    const data = parseJsonBody(responseBody);

    if (!response.ok) {
      const apiMessage = data.message || data.error;
      console.error('[Numvra Profile Upload] API error', {
        endpoint,
        status: response.status,
        responseBody,
        message: apiMessage,
      });

      if (response.status === 404) {
        throw new ApiError('Endpoint de upload de avatar nao encontrado na API: ' + endpoint, response.status);
      }

      throw new ApiError(
        apiMessage || 'Falha HTTP ' + response.status + ' ao enviar foto de perfil para ' + endpoint + '.',
        response.status,
      );
    }

    const photoURL = data.photoURL || data.avatarUrl || data.url;
    if (!photoURL) {
      console.error('[Numvra Profile Upload] invalid success response', {
        endpoint,
        status: response.status,
        responseBody,
      });
      throw new ApiError('A API nao retornou a URL da foto de perfil.', 500);
    }

    return withCacheBust(photoURL);
  },
};
