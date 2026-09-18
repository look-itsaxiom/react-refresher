import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A Dockerfile copies the entire project, then runs `npm ci`, then runs the build. A teammate reports that every CI build reinstalls all dependencies from scratch, even for pull requests that only touch a single component file. What is the fix?',
      choices: [
        { id: 'a', text: 'Switch base images from Alpine to slim; the install step is slow because of musl libc.' },
        {
          id: 'b',
          text: 'Reorder the Dockerfile so `package.json`/the lockfile are copied and installed before the rest of the source is copied in, so a source-only change only invalidates the layers after the install step.',
        },
        { id: 'c', text: 'Add a HEALTHCHECK instruction; without one, Docker reruns every layer on every build.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Docker layer caching is keyed on each instruction\'s inputs, in order. Copying the full source before installing means every `COPY . .` (and therefore every layer after it, including the install) is invalidated by any source change, since the layer diff for that COPY changes. Copying only the manifest/lockfile first isolates the install layer so it only reruns when dependencies actually change.',
    },
    {
      id: 'q2',
      prompt:
        "A team's frontend image builds fine on every developer's Apple Silicon laptop but crashes in production on `linux/amd64` with a native-module load error, right after they switched the base image from `node:22-slim` to `node:22-alpine` to shave size off the image. What's the most likely cause?",
      choices: [
        { id: 'a', text: 'Alpine images are always broken and should never be used for anything.' },
        {
          id: 'b',
          text: "Alpine uses musl libc instead of glibc; a native dependency (commonly one with prebuilt binaries, like Sharp) may not ship a musl-compatible build, so it fails to load even though the pure-JS parts of the image work fine.",
        },
        { id: 'c', text: 'The image needs a multi-arch manifest; Alpine images only support arm64.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "This is the standard Alpine gotcha: it's a smaller, musl-based distribution, and some native Node addons ship prebuilt binaries only for glibc. The failure mode is specifically native-dependency load errors, not a general Alpine problem — a pure-JS build is usually fine on Alpine.",
    },
    {
      id: 'q3',
      prompt:
        "An SSR container's Dockerfile ends with `CMD npm start`, where the `start` script is `node server.js`. In production, `docker stop` (which sends SIGTERM, then SIGKILL after a grace period) takes the full grace period to stop the container every time, instead of exiting immediately once in-flight requests drain. Why?",
      choices: [
        {
          id: 'a',
          text: "`npm start` is inherently slower to shut down than any other command.",
        },
        {
          id: 'b',
          text: 'Shell-form CMD runs a shell as PID 1 with the Node process as its child; SIGTERM goes to the shell, which typically does not forward it to the child, so the app never gets a chance to shut down gracefully and the container waits out the full SIGKILL timeout.',
        },
        { id: 'c', text: 'The HEALTHCHECK instruction is misconfigured and blocking shutdown.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Exec-form CMD (`CMD ["node", "server.js"]`) makes the app process PID 1 directly, so it receives signals from the container runtime itself and can react to SIGTERM. Shell-form CMD interposes a shell that owns PID 1 instead, and most shells do not propagate signals to child processes by default — the fix is exec-form CMD, or an init process (`--init`/tini) that forwards signals correctly if a shell is genuinely needed.',
    },
    {
      id: 'q4',
      prompt:
        "A Vite SPA needs a Stripe secret key available to its SSR API routes, and a developer names the env var `VITE_STRIPE_SECRET_KEY` so it's easy to find alongside the other `VITE_` config. What's wrong with this, specifically?",
      choices: [
        {
          id: 'a',
          text: 'Nothing — as long as the SSR routes read it server-side, the VITE_ prefix is just a naming convention.',
        },
        {
          id: 'b',
          text: "Vite inlines every `VITE_`-prefixed variable into the client-shipped JavaScript bundle at build time, so naming a secret with that prefix ships it to every browser that loads the app, regardless of intent or how it's used elsewhere.",
        },
        { id: 'c', text: 'VITE_ variables are fine for secrets as long as `NODE_ENV=production` is set.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "The `VITE_` prefix is not a hint about who reads the variable — it's an instruction to Vite's build step to inline that value into client-visible code. A secret can never carry that prefix; it needs to live in a server-only environment variable that the client bundle never references.",
    },
    {
      id: 'q5',
      prompt:
        'A product team ships a purely client-rendered marketing SPA with no server-side logic. An engineer proposes containerizing it with a multi-stage Dockerfile and deploying it to a Kubernetes cluster the company already runs for its backend services. Another engineer pushes back. Who has the stronger case, and why?',
      choices: [
        {
          id: 'a',
          text: 'The engineer proposing the container, because Kubernetes is the most production-grade option and should be preferred by default.',
        },
        {
          id: 'b',
          text: 'The engineer pushing back, if a static host with a CDN can serve the same build with less operational surface (no image builds, no orchestration, no runtime to patch) and nothing about the app needs a server process — the existing cluster is a reason it\'s *possible*, not a reason it\'s *necessary*.',
        },
        { id: 'c', text: 'Neither — a pure SPA cannot be deployed to Kubernetes at all.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "A container is the right tool when something needs a running process (SSR, an API) or when a target platform demands a Dockerfile. A static SPA with no server-side rendering doesn't need either, and reusing an existing cluster because it's there adds build, registry, and orchestration overhead for a workload a CDN already handles well. Availability of infrastructure isn't the same as need for it.",
    },
    {
      id: 'q6',
      prompt:
        "A security review asks a team to add image scanning and provenance attestations to their frontend container's CI pipeline before their first production deploy. What problem does this actually address that a working multi-stage Dockerfile alone does not?",
      choices: [
        {
          id: 'a',
          text: 'Nothing new — a correctly written multi-stage Dockerfile already guarantees the base image and dependencies are free of known vulnerabilities.',
        },
        {
          id: 'b',
          text: "A multi-stage build controls what ends up in the final image, but it says nothing about whether the base image or a dependency pulled in during the build has a known CVE, or whether the artifact that reaches production is provably the one CI actually built; scanning (e.g. Trivy, Docker Scout) and provenance/SBOM attestations address those two separate supply-chain questions.",
        },
        { id: 'c', text: 'It only matters for images published to a public registry; a private registry is exempt from this concern.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'A small, well-layered image is a build-hygiene property; it does not tell you whether the packages inside it are vulnerable, or whether the image a cluster pulls at deploy time is verifiably the one your pipeline produced. Scanning and provenance/SBOM attestations are the tools that answer those questions, and they matter regardless of whether the registry is public or private.',
    },
  ],
};
