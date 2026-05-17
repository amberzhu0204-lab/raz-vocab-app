import type { UnsplashPhoto } from '../types';

const UNSPLASH_ACCESS_KEY = ''; // 运行时设置

export function setUnsplashKey(key: string) {
  (unsplashService as any).accessKey = key;
}

const unsplashService = {
  accessKey: UNSPLASH_ACCESS_KEY,

  async search(query: string, perPage = 5): Promise<UnsplashPhoto[]> {
    if (!this.accessKey) {
      console.warn('Unsplash API key not set');
      return [];
    }

    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=squarish&per_page=${perPage}`,
        {
          headers: {
            Authorization: `Client-ID ${this.accessKey}`,
          },
        }
      );

      if (!res.ok) {
        console.warn(`Unsplash API error: ${res.status}`);
        return [];
      }

      const data = await res.json();
      return (data.results || []).map((r: any) => ({
        id: r.id,
        url: r.urls.regular,
        thumb: r.urls.thumb,
        alt: r.alt_description || r.description || query,
        author: r.user.name,
      }));
    } catch (e) {
      console.warn('Unsplash fetch failed:', e);
      return [];
    }
  },
};

export { unsplashService };
