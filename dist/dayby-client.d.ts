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
export declare class DayByClient {
    private apiUrl;
    private apiKey;
    constructor(config: DayByConfig);
    private request;
    listPosts(page?: number, perPage?: number): Promise<PostsListResponse>;
    getPost(slug: string): Promise<{
        post: DayByPost;
    }>;
    createPost(params: {
        title: string;
        content: string;
        visibility?: string;
    }): Promise<{
        post: DayByPost;
    }>;
    updatePost(slug: string, params: {
        title?: string;
        content?: string;
        visibility?: string;
    }): Promise<{
        post: DayByPost;
    }>;
    deletePost(slug: string): Promise<{
        message: string;
    }>;
    generateArticle(slug: string): Promise<{
        post: DayByPost;
        message: string;
    }>;
}
