
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: "مواعيدي", body: event.data.text() };
    }
  }

  const title = data.title || "مواعيدي 📅";
  const options = {
    body: data.body || "حان موعد مهم!",
    icon: "./icon.png",
    data: { url: "./" }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.openWindow("./")
  );
});
