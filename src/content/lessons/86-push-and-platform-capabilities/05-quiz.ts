import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A team wants push notifications to work identically for a user who has a Safari tab open on their iPhone versus one who installed the same site to their home screen. What is actually true on iOS?',
      choices: [
        { id: 'a', text: 'Both work the same way; Web Push has been fully supported in Safari on iOS for years.' },
        {
          id: 'b',
          text: 'Push only works for the installed home-screen web app (iOS 16.4+); an ordinary Safari tab cannot receive Web Push at all on iOS.',
        },
        { id: 'c', text: 'Neither works; Apple has never shipped Web Push in any form.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Apple gated Web Push behind installation on iOS: only a home-screen-installed PWA can subscribe and receive push, starting iOS 16.4. A tab open in the Safari browser itself has no access to the Push API on iOS, even though desktop Safari (macOS 13+) doesn't have that installation requirement.",
    },
    {
      id: 'q2',
      prompt:
        'Your server needs to send an encrypted push payload to a subscription. Which piece of information does it use to encrypt the message, and which does it use to prove the message came from your server?',
      choices: [
        {
          id: 'a',
          text: 'It encrypts with the subscription\'s p256dh/auth keys and proves origin with a VAPID signature made from your server\'s own key pair.',
        },
        { id: 'b', text: 'It encrypts with its VAPID private key and proves origin with the subscription endpoint URL alone.' },
        { id: 'c', text: 'Encryption and origin proof are both handled entirely by the push service; the server sends plaintext.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "The subscription's p256dh and auth keys are what let your server encrypt a payload the push service itself can't read (RFC 8291). VAPID (RFC 8292) is a separate mechanism: your server signs the request with its own private key so the push service can verify which application server is allowed to push to that subscription.",
    },
    {
      id: 'q3',
      prompt:
        "A notification permission prompt fires the moment a new user lands on the homepage, before they've done anything. Predict the practical effect, and name the pattern that avoids it.",
      choices: [
        {
          id: 'a',
          text: "It's harmless — users can always change their mind later by calling requestPermission() again after a denial.",
        },
        {
          id: 'b',
          text: 'Most browsers only let you meaningfully ask once; an unsolicited prompt is likely to be denied out of reflex, and that denial is close to permanent since a later requestPermission() call resolves denied with no prompt at all. Priming — explaining the value first, behind your own UI, and only triggering the real prompt after an explicit opt-in click — avoids burning that one shot.',
        },
        { id: 'c', text: 'Chrome\'s quiet UI mode guarantees every prompt gets a fair, considered answer regardless of timing.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'A permission denial is effectively one-way: the browser will not re-prompt on your behalf, so requestPermission() after a denial just returns denied silently. Because that first ask is so expensive, spend it only after the user has already signaled interest via your own priming UI.',
    },
    {
      id: 'q4',
      prompt:
        'An app declares `share_target` in its manifest so other apps can share content into it, but the feature never activates for any user. What is the most likely missing piece?',
      choices: [
        {
          id: 'a',
          text: 'share_target requires the app to also declare file_handlers, even for text-only sharing.',
        },
        {
          id: 'b',
          text: "Share Target only activates once the app is installed with an active service worker handling the target route — a manifest declaration with no registered, active SW (or an app the user hasn't installed) never shows up as a share destination.",
        },
        { id: 'c', text: 'Share Target requires the receiving app to call navigator.share() itself on load to register as a target.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Declaring share_target is necessary but not sufficient. The OS only offers an installed PWA as a share destination, and the manifest's action route needs a service worker actually running to handle the resulting navigation/POST.",
    },
    {
      id: 'q5',
      prompt:
        "A product wants to use Web Bluetooth so a PWA can talk directly to in-store hardware, and asks whether this will work for all customers on all browsers. What's the honest answer?",
      choices: [
        {
          id: 'a',
          text: "Yes — Web Bluetooth, along with Web USB, Serial, HID, and NFC, is a finished, cross-browser web standard at this point.",
        },
        {
          id: 'b',
          text: "No — these 'Fugu' hardware APIs are Chromium/Edge-only; Apple's and Mozilla's security teams have explicitly declined to implement them, so this only works for customers on a Chromium-based browser.",
        },
        { id: 'c', text: 'No — no browser has ever implemented Web Bluetooth; it exists only as a draft specification.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Web Bluetooth/USB/Serial/HID/NFC are real and shipped, but only in Chromium-based browsers. Both Apple and Mozilla have stated security objections to implementing them, so a product built on these must accept a Chromium-only constraint (fine for kiosk hardware or internal tools, a hard blocker for a general consumer PWA).',
    },
    {
      id: 'q6',
      prompt:
        "A component calls navigator.share(data) directly inside a useEffect that runs on mount, so the share sheet opens automatically when the page loads. What breaks, and why?",
      choices: [
        {
          id: 'a',
          text: "Nothing breaks; navigator.share() works identically whether or not it's triggered by a user gesture.",
        },
        {
          id: 'b',
          text: "navigator.share() requires an active user gesture (like a click handler) to be invoked at all; calling it from an effect on mount will reject or silently fail in every browser that implements it, because there's no gesture backing the call.",
        },
        { id: 'c', text: "It only breaks on mobile; desktop browsers allow navigator.share() to be called from anywhere." },
      ],
      correctChoiceId: 'b',
      explanation:
        "Web Share is gated on user activation specifically to prevent pages from spamming the native share sheet. A useEffect on mount has no user gesture behind it, so the call fails — the fix is to only ever call share() from inside a click (or similar) handler.",
    },
  ],
};
