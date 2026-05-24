const CACHE_NAME = 'jjang-scheduler-v5';

// 아이콘/매니페스트만 캐싱 (HTML은 항상 네트워크에서 받음)
const STATIC_ASSETS = [
  './icon-192.png',
  './icon-512.png',
  './manifest.json'
];

// 설치
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// 구버전 캐시 정리
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// fetch: HTML은 항상 네트워크 우선, 나머지는 캐시 우선
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isHTML = event.request.headers.get('accept')?.includes('text/html')
              || url.pathname.endsWith('.html')
              || url.pathname === '/'
              || url.pathname === '';

  if (isHTML) {
    // 네트워크 우선 → 실패 시 캐시
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // 정적 자산: 캐시 우선 → 없으면 네트워크 후 캐시 저장
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return res;
      }).catch(() => {});
    })
  );
});

// ── 알람 타이머 ──
const alarmTimers = new Map();

self.addEventListener('message', (event) => {
  const { type, alarms } = event.data || {};

  if (type === 'SCHEDULE_ALARM') {
    // 기존 타이머 초기화
    alarmTimers.forEach(id => clearTimeout(id));
    alarmTimers.clear();

    const now = Date.now();
    (alarms || []).forEach(alarm => {
      const delay = alarm.ts - now;
      if (delay < 0 || delay > 24 * 60 * 60 * 1000) return;
      const tid = setTimeout(() => {
        self.registration.showNotification(alarm.title || '🐾 짱아 안약 시간!', {
          body: alarm.body || '투약 시간입니다!',
          icon: './icon-192.png',
          badge: './icon-192.png',
          tag: alarm.id,
          requireInteraction: true,
          vibrate: [200, 100, 200]
        });
      }, delay);
      alarmTimers.set(alarm.id, tid);
    });
  }

  if (type === 'RESET_ALARMS') {
    alarmTimers.forEach(id => clearTimeout(id));
    alarmTimers.clear();
  }

  if (type === 'PING') {
    event.source?.postMessage({ type: 'PONG', alarmCount: alarmTimers.size });
  }
});

// 서버 Push 수신
self.addEventListener('push', (event) => {
  let data = { title: '🐾 짱아 안약 시간!', body: '투약 시간입니다!' };
  if (event.data) {
    try { data = event.data.json(); } catch(e) { data.body = event.data.text(); }
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || './icon-192.png',
      badge: './icon-192.png',
      tag: data.tag || 'push-alarm',
      requireInteraction: true,
      vibrate: [200, 100, 200]
    })
  );
});

// 알림 클릭 시 앱 열기
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      if (list.length > 0) { list[0].focus(); return; }
      clients.openWindow('./');
    })
  );
});
