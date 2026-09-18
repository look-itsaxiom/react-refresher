export type Invocation = { t: number; durationMs: number };
export type Model = {
  kind: 'server' | 'function' | 'isolate';
  coldStartMs: number;
  idleTimeoutMs: number;
  maxConcurrencyPerInstance: number;
};
export type SimResult = {
  coldStarts: number;
  p50Ms: number;
  p95Ms: number;
  instanceSeconds: number;
  requestCount: number;
};
export type Pricing = { perRequest: number; perGbSecond: number; memoryGb: number };

export function simulateInvocations(requests: Invocation[], model: Model): SimResult {
  // TODO: sort by t, then branch on model.kind ('server' vs 'function'/'isolate')
  return { coldStarts: 0, p50Ms: 0, p95Ms: 0, instanceSeconds: 0, requestCount: requests.length };
}

export function estimateCost(sim: SimResult, pricing: Pricing): number {
  // TODO: requestCount * perRequest + instanceSeconds * memoryGb * perGbSecond
  return 0;
}

export default function App() {
  return <p>Simulator starter</p>;
}
