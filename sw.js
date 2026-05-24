const CACHE_NAME = 'jjang-a-scheduler-v4';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './logo.png',
  './apple-touch-icon-180x180.png',
  './apple-touch-icon-167x167.png',
  './apple-touch-icon-152x152.png',
  './icon-192x192.png',
  './icon-512x512.png'
];

// 서비스 워커 설치 및 리소스 캐싱
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching all core assets');
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// 활성화 및 구버전 캐시 정리
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 네트워크 패치 요청 및 캐시 우선 전략 (Offline support)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          if (event.request.url.startsWith('http')) {
            cache.put(event.request, responseToCache);
          }
        });

        return networkResponse;
      }).catch(() => {
        console.warn('[Service Worker] Network request failed and no cache available');
      });
    })
  );
});

// 백그라운드 알림 푸시 수신 브릿지
self.addEventListener('push', (event) => {
  let data = { title: '짱아 안약 시간 🐶', body: '안약을 넣을 시간입니다!' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: './apple-touch-icon-180x180.png',
    badge: './apple-touch-icon-180x180.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});
