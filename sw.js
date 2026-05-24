const CACHE_NAME = 'jjang-scheduler-v6';

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

// 구버전 캐시 정리 + 모든 클라이언트 강제 새로고침
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map(key => caches.delete(key)))) // 모든 캐시 삭제
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => clients.forEach(client => client.postMessage({ type: 'SW_UPDATED' })))
  );
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
  const { type, alarmId, medName, timeStr, doseLabel, msUntil } = event.data || {};

  if (type === 'SCHEDULE_ALARM') {
    // 같은 ID 타이머가 있으면 교체
    if (alarmTimers.has(alarmId)) clearTimeout(alarmTimers.get(alarmId));
    const tid = setTimeout(() => {
      self.registration.showNotification('🐾 짱아 안약 시간!', {
        body: `${medName} ${doseLabel} (${timeStr})`,
        icon: './icon-192.png',
        badge: './icon-192.png',
        tag: alarmId,
        requireInteraction: true,
        vibrate: [200, 100, 200]
      });
      alarmTimers.delete(alarmId);
    }, msUntil);
    alarmTimers.set(alarmId, tid);
  }

  if (type === 'CANCEL_ALARM') {
    if (alarmTimers.has(alarmId)) {
      clearTimeout(alarmTimers.get(alarmId));
      alarmTimers.delete(alarmId);
    }
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
