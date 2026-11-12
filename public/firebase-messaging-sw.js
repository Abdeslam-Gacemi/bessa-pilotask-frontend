/* Firebase Cloud Messaging service worker: shows pushes while no Pilotask tab is open.
   The Firebase web config arrives in this script's query string (see src/services/push.ts). */
importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js");

const config = Object.fromEntries(new URL(self.location.href).searchParams.entries());
firebase.initializeApp(config);
firebase.messaging();
