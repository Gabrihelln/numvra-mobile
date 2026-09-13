import Config from 'react-native-config';
import { auth } from '../config/firebase';

const REQUEST_TIMEOUT_MS = 15_000;

export class ApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

const getApiBaseUrl = () => {
  const apiBaseUrl = Config.API_BASE_URL?.trim().replace(/\/$/, '');

  if (!apiBaseUrl || !/^https:\/\//i.test(apiBaseUrl)) {
    throw new ApiError('A API do Numvra não está configurada.');
  }

  return apiBaseUrl;
};

const getErrorMessage = (status: number) => {
  if (status === 400) return 'A solicitação enviada à API é inválida.';
  if (status === 401) return 'Sua sessão expirou. Faça login novamente.';
  if (status === 403) return 'Você não tem permissão para esta ação.';
  if (status === 404) return 'O serviço solicitado não foi encontrado.';
  if (status >= 500) return 'O serviço está indisponível no momento. Tente novamente mais tarde.';
  return 'Não foi possível concluir a solicitação.';
};

export const api = {
  getBaseUrl: getApiBaseUrl,

  async request<T>(path: string, options: RequestInit = {}, authenticated = false, authToken?: string): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const headers = new Headers(options.headers);
      headers.set('Accept', 'application/json');

      if (authenticated) {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new ApiError('Faça login novamente para continuar.', 401);
        headers.set('Authorization', `Bearer ${authToken || await currentUser.getIdToken()}`);
      }

      const response = await fetch(`${getApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`, {
        ...options,
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        console.warn(`[Numvra API] ${options.method || 'GET'} ${path} failed with HTTP ${response.status}`);
        throw new ApiError(getErrorMessage(response.status), response.status);
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError('A conexão com a API demorou mais que o esperado.');
      }
      console.warn(`[Numvra API] ${options.method || 'GET'} ${path} could not be reached.`);
      throw new ApiError('Não foi possível conectar à API do Numvra.');
    } finally {
      clearTimeout(timeout);
    }
  },

  get<T>(path: string, authenticated = true) {
    return this.request<T>(path, { method: 'GET' }, authenticated);
  },

  post<T>(path: string, body: unknown, authenticated = true, extraHeaders?: Record<string, string>, authToken?: string) {
    return this.request<T>(
      path,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(extraHeaders || {}) },
        body: JSON.stringify(body),
      },
      authenticated,
      authToken,
    );
  },
};
