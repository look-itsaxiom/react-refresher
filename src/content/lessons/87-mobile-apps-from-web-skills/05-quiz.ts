import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        "A team's existing product is a React web app that needs App Store and Play Store listings within a month, has no need for camera/biometrics/background location, and can't spare time to learn a new component model. Someone proposes a full React Native rewrite because \"that's what real mobile apps use.\" What's the strongest objection?",
      choices: [
        {
          id: 'a',
          text: 'React Native cannot produce App Store or Play Store listings, so the proposal is technically impossible.',
        },
        {
          id: 'b',
          text: "Capacitor wraps the existing web app (DOM, CSS, components) in a native shell with store listings on both platforms in roughly the time it takes to add the wrapper and a couple of plugins — a full React Native rewrite trades a same-day option for a new component model, no CSS cascade, and no DOM, to gain native APIs this team doesn't need yet.",
        },
        {
          id: 'c',
          text: 'React Native and Capacitor produce functionally identical results, so the choice is arbitrary and the objection is moot.',
        },
      ],
      correctChoiceId: 'b',
      explanation:
        "Matching the tool to the actual requirement matters more than matching it to a reputation. When the requirement is \"ship existing web app to both stores, no deep native APIs needed,\" Capacitor answers it directly; React Native answers a requirement (deep native API access, native view performance) this team doesn't have yet, at the cost of a real rewrite.",
    },
    {
      id: 'q2',
      prompt:
        "A developer reading older React Native material keeps seeing \"the bridge\" described as the thing that connects JS to native code, and assumes that's still accurate for a project scaffolded today. What's wrong with that assumption?",
      choices: [
        {
          id: 'a',
          text: 'Nothing — the bridge is still the mechanism, just renamed in newer docs.',
        },
        {
          id: 'b',
          text: "Since React Native 0.76 (October 2024), New Architecture is the default: JSI lets JS call native methods directly and synchronously, Fabric is the JSI-based renderer, and TurboModules replaces bridge-mediated native modules — the asynchronous, JSON-serializing bridge the older material describes isn't merely deprecated, it's the thing New Architecture was built to remove.",
        },
        {
          id: 'c',
          text: 'The bridge was replaced, but only for Android; iOS still uses the original bridge architecture.',
        },
      ],
      correctChoiceId: 'b',
      explanation:
        "\"Bridgeless\" is the accurate word for where a New-Architecture app stands: JSI gives JS direct, synchronous references to native objects instead of routing every call through an async, serializing bridge. A developer relying on older tutorials should confirm which architecture a given codebase is actually running rather than assuming the bridge model still applies.",
    },
    {
      id: 'q3',
      prompt:
        "A team chooses React Native for a new app and decides to skip Expo, reasoning \"Expo is a beginner training-wheels layer, and we're experienced enough to work with bare React Native directly.\" What does this miss?",
      choices: [
        {
          id: 'a',
          text: "Nothing — Expo exists only to simplify onboarding for newcomers, so an experienced team loses nothing by skipping it.",
        },
        {
          id: 'b',
          text: "React Native's own documentation has recommended Expo as the framework layer since 2024, not as a beginner-only convenience — Continuous Native Generation (prebuild), EAS Build/Update/Submit, and the Expo Modules API solve real problems (owning generated native folders, cloud builds, OTA JS updates) that an experienced team would otherwise have to solve itself, not problems only beginners have.",
        },
        {
          id: 'c',
          text: 'Expo can only be adopted at project creation; an existing bare React Native project can never add it later.',
        },
      ],
      correctChoiceId: 'b',
      explanation:
        "Expo's value proposition in 2026 is toolchain, not hand-holding: CNG means you don't hand-maintain `ios/`/`android/` folders, EAS means you don't need local Xcode/Android Studio to ship a build, and EAS Update gives you the OTA channel a bare React Native project would have to build from scratch. Skipping it trades away real infrastructure, not just guardrails.",
    },
    {
      id: 'q4',
      prompt:
        "A React Native app ships a bug fix that only touches JavaScript logic (no native module changes) through EAS Update, and the team treats this the same as shipping a native binary update through the App Store. What's the key difference they're missing?",
      choices: [
        {
          id: 'a',
          text: "There is no difference — both paths go through the same App Store review process either way.",
        },
        {
          id: 'b',
          text: "A JS-only OTA update via EAS Update reaches users in minutes with no store review, while any change touching native code or dependencies requires a new binary build and a full store review cycle — conflating the two means either overestimating how fast a native fix can ship, or underestimating the review risk of shipping native changes through a channel meant for JS-only patches.",
        },
        {
          id: 'c',
          text: 'EAS Update is only for Android; iOS bug fixes always require a full store review regardless of what changed.',
        },
      ],
      correctChoiceId: 'b',
      explanation:
        "The OTA-versus-store-review split is exactly the axis that matters for release planning: JS-only changes can move fast on their own cadence, but the moment a fix needs new native code, it re-enters store review's timeline. Treating every change as equally fast (or equally slow) leads to bad release commitments either way.",
    },
    {
      id: 'q5',
      prompt:
        "A team wants one pixel-identical UI across iOS, Android, and desktop, is not deeply invested in existing React code, and is willing to learn a new language. They're deciding between React Native and Flutter. What consideration should carry the most weight?",
      choices: [
        {
          id: 'a',
          text: "React Native must be the answer regardless of the scenario, since it's the option that uses JavaScript.",
        },
        {
          id: 'b',
          text: "Flutter draws its own UI with its own renderer (Impeller) directly onto a canvas on every platform, which is what actually produces a pixel-identical UI everywhere by default — React Native instead produces real native views per platform, which look native precisely because they aren't forced to look identical; a team whose priority is pixel-identical UI across platforms is describing Flutter's core bet, not React Native's.",
        },
        {
          id: 'c',
          text: 'Flutter and React Native produce visually identical results on every platform, so the choice should be based only on team size.',
        },
      ],
      correctChoiceId: 'b',
      explanation:
        "This question flips the usual React-first instinct on purpose: React Native's whole value is native-feeling, platform-respecting UI, which is the opposite of what a \"pixel-identical everywhere\" requirement is asking for. Flutter's own-renderer model is the more direct match for that specific requirement, and the team's stated openness to learning a new language and lower investment in existing React code both weaken the usual argument for staying with React Native.",
    },
    {
      id: 'q6',
      prompt:
        "A team already ships a well-built PWA and considers adding a Capacitor-wrapped version purely to get an App Store listing, since the content and functionality would be identical either way. What real consideration does this plan need to account for, beyond development cost?",
      choices: [
        {
          id: 'a',
          text: "None — a Capacitor wrapper around an existing PWA is guaranteed store approval since the underlying app already works.",
        },
        {
          id: 'b',
          text: "App Store review has historically scrutinized web wrappers with minimal added functionality (Apple's guideline 4.2, though teams should verify current wording and enforcement before relying on it) — a wrapper that adds nothing native-feeling beyond what the PWA already does risks rejection or required changes, which is a real planning cost independent of how well the PWA itself works.",
        },
        {
          id: 'c',
          text: 'This concern only applies to Android\'s Play Store, not Apple\'s App Store.',
        },
      ],
      correctChoiceId: 'b',
      explanation:
        "A technically working wrapper isn't automatically an approved listing. Store review policies around minimal-functionality web wrappers are a real, if sometimes inconsistently enforced, risk that belongs in the decision alongside engineering cost — which is exactly the kind of thing this lesson's decision matrix exists to surface before it becomes a rejected submission.",
    },
  ],
};
