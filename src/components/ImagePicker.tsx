import { useState, useEffect } from 'react';
import type { UnsplashPhoto } from '../types';
import { unsplashService } from '../services/unsplash';

interface ImagePickerProps {
  query: string;
  currentUrl: string;
  onSelect: (url: string) => void;
}

export default function ImagePicker({ query, currentUrl, onSelect }: ImagePickerProps) {
  const [photos, setPhotos] = useState<UnsplashPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!query) return;
    let cancelled = false;

    async function fetch() {
      setLoading(true);
      setError('');
      const results = await unsplashService.search(query);
      if (!cancelled) {
        setPhotos(results);
        if (results.length === 0) setError('未找到图片，请尝试其他关键词');
        setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [query]);

  return (
    <div>
      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <div className="animate-spin w-4 h-4 border-2 border-kid-primary border-t-transparent rounded-full" />
          搜索图片中...
        </div>
      )}

      {error && <p className="text-sm text-orange-500 mb-2">{error}</p>}

      {currentUrl && (
        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-1">当前图片：</p>
          <img src={currentUrl} alt="current" className="w-24 h-24 object-cover rounded-lg border-2 border-kid-primary" />
        </div>
      )}

      {photos.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-1">选择图片：</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {photos.map((p) => (
              <button
                key={p.id}
                onClick={() => onSelect(p.url)}
                className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                  currentUrl === p.url ? 'border-kid-primary ring-2 ring-kid-primary/30' : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                <img src={p.thumb} alt={p.alt} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {!loading && photos.length === 0 && !error && query && (
        <p className="text-xs text-gray-400">输入关键词后自动搜索</p>
      )}
    </div>
  );
}
