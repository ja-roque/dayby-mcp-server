/**
 * DayBy API v2 client — thin wrapper around the REST API.
 */

export interface DayByConfig {
  apiUrl: string;
  apiKey: string;
}

export interface DayByPost {
  id: number;
  title: string;
  slug: string;
  content: string;
  visibility: string;
  has_article: boolean;
  url: string;
  created_at: string;
  updated_at: string;
}

export interface PostsListResponse {
  posts: DayByPost[];
  meta: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
}

export class DayByClient {
  private apiUrl: string;
  private apiKey: string;

  constructor(config: DayByConfig) {
    this.apiUrl = config.apiUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const url = `${this.apiUrl}${path}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(`DayBy API error (${res.status}): ${JSON.stringify(error)}`);
    }

    return res.json() as Promise<T>;
  }

  async listPosts(page = 1, perPage = 10): Promise<PostsListResponse> {
    return this.request<PostsListResponse>(
      'GET',
      `/api/v2/posts?page=${page}&per_page=${perPage}`
    );
  }

  async getPost(slug: string): Promise<{ post: DayByPost }> {
    return this.request<{ post: DayByPost }>('GET', `/api/v2/posts/${slug}`);
  }

  async createPost(params: {
    title: string;
    content: string;
    visibility?: string;
  }): Promise<{ post: DayByPost }> {
    return this.request<{ post: DayByPost }>('POST', '/api/v2/posts', {
      post: params,
    });
  }

  async updatePost(
    slug: string,
    params: { title?: string; content?: string; visibility?: string }
  ): Promise<{ post: DayByPost }> {
    return this.request<{ post: DayByPost }>('PUT', `/api/v2/posts/${slug}`, {
      post: params,
    });
  }

  async deletePost(slug: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('DELETE', `/api/v2/posts/${slug}`);
  }

  async generateArticle(slug: string): Promise<{ post: DayByPost; message: string }> {
    return this.request<{ post: DayByPost; message: string }>(
      'POST',
      `/api/v2/posts/${slug}/generate_article`
    );
  }
}
