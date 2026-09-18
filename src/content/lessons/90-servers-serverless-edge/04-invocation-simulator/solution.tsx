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

function percentile(sortedAsc: number[], p: number): number {
  const n = sortedAsc.length;
  const index = Math.min(n - 1, Math.max(0, Math.ceil((p / 100) * n) - 1));
  return sortedAsc[index]!;
}

type Instance = { activeEnds: number[]; lastEndTime: number };

export function simulateInvocations(requests: Invocation[], model: Model): SimResult {
  const sorted = [...requests].sort((a, b) => a.t - b.t);
  const latencies: number[] = [];
  let coldStarts = 0;
  let instanceSeconds = 0;

  if (model.kind === 'server') {
    let maxEnd = 0;
    for (const r of sorted) {
      latencies.push(r.durationMs);
      maxEnd = Math.max(maxEnd, r.t + r.durationMs);
    }
    instanceSeconds = maxEnd / 1000;
  } else {
    const instances: Instance[] = [];
    for (const r of sorted) {
      let chosen: Instance | null = null;
      for (const inst of instances) {
        const active = inst.activeEnds.filter((end) => end > r.t);
        const idleFor = r.t - inst.lastEndTime;
        const retired = active.length === 0 && idleFor >= model.idleTimeoutMs;
        if (retired) continue;
        if (active.length < model.maxConcurrencyPerInstance) {
          inst.activeEnds = active;
          chosen = inst;
          break;
        }
      }

      let latency: number;
      if (chosen) {
        latency = r.durationMs;
        const end = r.t + latency;
        chosen.activeEnds.push(end);
        chosen.lastEndTime = Math.max(chosen.lastEndTime, end);
      } else {
        coldStarts++;
        latency = model.coldStartMs + r.durationMs;
        const end = r.t + latency;
        instances.push({ activeEnds: [end], lastEndTime: end });
      }
      latencies.push(latency);
      instanceSeconds += latency / 1000;
    }
  }

  const sortedLatencies = [...latencies].sort((a, b) => a - b);
  return {
    coldStarts,
    p50Ms: percentile(sortedLatencies, 50),
    p95Ms: percentile(sortedLatencies, 95),
    instanceSeconds,
    requestCount: requests.length,
  };
}

export function estimateCost(sim: SimResult, pricing: Pricing): number {
  return sim.requestCount * pricing.perRequest + sim.instanceSeconds * pricing.memoryGb * pricing.perGbSecond;
}

export default function App() {
  return <p>Simulator ready</p>;
}
