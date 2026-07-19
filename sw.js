var CACHE_NAME = 'timepatch-v2';
var ASSETS_TO_CACHE = [
    './index.html',
    './manifest.json',
    './icon.png',
    'https://cdn.tailwindcss.com',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.8/dist/chart.umd.min.js',
    'https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js'
];

self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return Promise.allSettled(
                ASSETS_TO_CACHE.map(function(url) {
                    return cache.add(url).catch(function(err) {
                        console.warn('Failed to cache:', url, err);
                    });
                })
            );
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(keys) {
            return Promise.all(
                keys.filter(function(key) { return key !== CACHE_NAME; })
                    .map(function(key) { return caches.delete(key); })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', function(event) {
    if (event.request.method !== 'GET') return;

    var url = new URL(event.request.url);
    
    // For local assets, use Cache First strategy
    if (url.origin === location.origin) {
        event.respondWith(
            caches.match(event.request).then(function(cached) {
                return cached || fetch(event.request).then(function(response) {
                    if (response && response.status === 200) {
                        var clone = response.clone();
                        caches.open(CACHE_NAME).then(function(cache) {
                            cache.put(event.request, clone);
                        });
                    }
                    return response;
                });
            })
        );
    } 
    // For CDN resources (Tailwind, Chart.js, Sortable), use Stale-While-Revalidate
    else {
        event.respondWith(
            caches.match(event.request).then(function(cached) {
                var fetchPromise = fetch(event.request).then(function(response) {
                    if (response && response.status === 200) {
                        var clone = response.clone();
                        caches.open(CACHE_NAME).then(function(cache) {
                            cache.put(event.request, clone);
                        });
                    }
                    return response;
                }).catch(function() {
                    return cached;
                });
                return cached || fetchPromise;
            })
        );
    }
});
