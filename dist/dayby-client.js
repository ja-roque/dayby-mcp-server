"use strict";
/**
 * DayBy API v2 client — thin wrapper around the REST API.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DayByClient = void 0;
class DayByClient {
    apiUrl;
    apiKey;
    constructor(config) {
        this.apiUrl = config.apiUrl.replace(/\/$/, '');
        this.apiKey = config.apiKey;
    }
    async request(method, path, body) {
        const url = `${this.apiUrl}${path}`;
        const headers = {
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
        return res.json();
    }
    async listPosts(page = 1, perPage = 10) {
        return this.request('GET', `/api/v2/posts?page=${page}&per_page=${perPage}`);
    }
    async getPost(slug) {
        return this.request('GET', `/api/v2/posts/${slug}`);
    }
    async createPost(params) {
        return this.request('POST', '/api/v2/posts', {
            post: params,
        });
    }
    async updatePost(slug, params) {
        return this.request('PUT', `/api/v2/posts/${slug}`, {
            post: params,
        });
    }
    async deletePost(slug) {
        return this.request('DELETE', `/api/v2/posts/${slug}`);
    }
    async generateArticle(slug) {
        return this.request('POST', `/api/v2/posts/${slug}/generate_article`);
    }
}
exports.DayByClient = DayByClient;
