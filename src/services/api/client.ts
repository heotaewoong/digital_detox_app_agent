const DEFAULT_BASE_URL = 'https://api.contentguardian.example.com/v1';

interface ApiError {
  status: number;
  message: string;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null;

  constructor(baseUrl: string = DEFAULT_BASE_URL) {
    this.baseUrl = baseUrl;
    this.token = null;
  }

  /**
   * Sets the authentication token for subsequent requests.
   */
  setToken(token: string): void {
    this.token = token;
  }

  /**
   * Clears the authentication token.
   */
  clearToken(): void {
    this.token = null;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const options: RequestInit = {
      method,
      headers: this.getHeaders(),
    };

    if (body !== undefined) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        let message = `Request failed with status ${response.status}`;
        try {
          const errorBody = await response.json();
          if (errorBody.message) {
            message = errorBody.message;
          }
        } catch {
          // Use default message if body parsing fails
        }

        const error: ApiError = {
          status: response.status,
          message,
        };
        throw error;
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return undefined as T;
      }

      return (await response.json()) as T;
    } catch (error) {
      if ((error as ApiError).status) {
        throw error;
      }
      throw {
        status: 0,
        message:
          error instanceof Error
            ? error.message
            : '네트워크 오류가 발생했습니다.',
      } as ApiError;
    }
  }

  /**
   * Sends a GET request.
   */
  async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  /**
   * Sends a POST request with a JSON body.
   */
  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  /**
   * Sends a PUT request with a JSON body.
   */
  async put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  /**
   * Sends a DELETE request.
   */
  async delete(path: string): Promise<void> {
    await this.request<void>('DELETE', path);
  }
}

export const apiClient = new ApiClient();
export { ApiClient };
