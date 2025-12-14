const CACHE_NAME = 'lumina-v2-cache';
const IMAGE_CACHE = 'lumina-images-v1';

const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json'
];

// 1. Install Phase: Cache Core UI Assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// 2. Fetch Phase: Dynamic Caching for Pexels Images
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Special handling for Pexels Images
    if (url.hostname === 'images.pexels.com') {
        event.respondWith(
            caches.open(IMAGE_CACHE).then((cache) => {
                return cache.match(request).then((response) => {
                    // Return cached image OR fetch and cache it
                    return response || fetch(request).then((networkResponse) => {
                        cache.put(request, networkResponse.clone());
                        return networkResponse;
                    });
                });
            })
        );
    } else {
        // Standard Cache-First for UI Assets
        event.respondWith(
            caches.match(request).then((response) => {
                return response || fetch(request);
            })
        );
    }
});

// 3. Activate Phase: Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME && key !== IMAGE_CACHE)
                    .map(key => caches.delete(key))
            );
        })
    );
});