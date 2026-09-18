import type { ComponentType } from 'react';
import type { Check } from '../../../types';

type StorageOption = 'memory' | 'localStorage' | 'sessionStorage' | 'httpOnlyCookie' | 'bff';
type CsrfDefense = 'sameSite' | 'token' | 'fetchMetadata' | 'none';
type XssRisk = 'low' | 'medium' | 'high';
type AttackerCapability = 'xss' | 'physicalDevice' | 'csrf';
type Grade = 'A' | 'B' | 'C' | 'D' | 'F';
type StoragePlan = {
  accessToken: StorageOption;
  refreshToken: StorageOption;
  csrfDefense: CsrfDefense;
  xssRisk: XssRisk;
};
type RiskAssessment = {
  stealsAccessToken: AttackerCapability[];
  stealsRefreshToken: AttackerCapability[];
  grade: Grade;
  recommendations: string[];
};
type ApiResult = { status: number; body: string };
type Api = (token: string | null) => Promise<ApiResult>;
type Refresh = () => Promise<string>;

type Mod = {
  storageRisk: (plan: StoragePlan) => RiskAssessment;
  getAccessToken: () => string | null;
  TokenHolder: ComponentType<{ api: Api; refresh: Refresh }>;
};

const plan = (overrides: Partial<StoragePlan> = {}): StoragePlan => ({
  accessToken: 'memory',
  refreshToken: 'httpOnlyCookie',
  csrfDefense: 'sameSite',
  xssRisk: 'low',
  ...overrides,
});

export const checks: Check[] = [
  {
    name: 'storageRisk: memory + httpOnlyCookie with a CSRF defense and low XSS risk grades A',
    run: async ({ mod, expect }) => {
      const { storageRisk } = mod as unknown as Mod;
      const result = storageRisk(plan());
      expect(result.grade).to.equal('A');
      expect(result.stealsAccessToken).to.have.members(['xss']);
      expect(result.stealsRefreshToken).to.have.members(['physicalDevice']);
    },
  },
  {
    name: 'storageRisk: bff for both tokens grades A regardless of xssRisk',
    run: async ({ mod, expect }) => {
      const { storageRisk } = mod as unknown as Mod;
      const result = storageRisk(plan({ accessToken: 'bff', refreshToken: 'bff', xssRisk: 'high', csrfDefense: 'token' }));
      expect(result.grade).to.equal('A');
      expect(result.stealsAccessToken).to.deep.equal([]);
      expect(result.stealsRefreshToken).to.deep.equal([]);
      expect(result.recommendations).to.have.lengthOf(1);
      expect(result.recommendations[0]).to.match(/recommended pattern/i);
    },
  },
  {
    name: 'storageRisk: localStorage access token with high XSS risk grades D and flags both capabilities',
    run: async ({ mod, expect }) => {
      const { storageRisk } = mod as unknown as Mod;
      const result = storageRisk(plan({ accessToken: 'localStorage', refreshToken: 'memory', csrfDefense: 'none', xssRisk: 'high' }));
      expect(result.grade).to.equal('D');
      expect(result.stealsAccessToken).to.have.members(['xss', 'physicalDevice']);
      expect(result.stealsRefreshToken).to.have.members(['xss']);
      expect(result.recommendations.some((r) => /localStorage/i.test(r))).to.equal(true);
    },
  },
  {
    name: 'storageRisk: both tokens in httpOnlyCookie with no CSRF defense grades B and flags csrf',
    run: async ({ mod, expect }) => {
      const { storageRisk } = mod as unknown as Mod;
      const result = storageRisk(plan({ accessToken: 'httpOnlyCookie', refreshToken: 'httpOnlyCookie', csrfDefense: 'none', xssRisk: 'low' }));
      expect(result.grade).to.equal('B');
      expect(result.stealsAccessToken).to.have.members(['physicalDevice', 'csrf']);
      expect(result.recommendations.some((r) => /csrf/i.test(r))).to.equal(true);
      expect(result.recommendations.some((r) => /memory|BFF/i.test(r))).to.equal(true);
      expect(result.recommendations).to.have.lengthOf(2);
    },
  },
  {
    name: 'storageRisk: sessionStorage access token with medium XSS risk grades C',
    run: async ({ mod, expect }) => {
      const { storageRisk } = mod as unknown as Mod;
      const result = storageRisk(plan({ accessToken: 'sessionStorage', refreshToken: 'memory', csrfDefense: 'none', xssRisk: 'medium' }));
      expect(result.grade).to.equal('C');
      expect(result.recommendations.some((r) => /sessionStorage/i.test(r))).to.equal(true);
    },
  },
  {
    name: 'storageRisk: httpOnlyCookie with a defense in place does not flag csrf',
    run: async ({ mod, expect }) => {
      const { storageRisk } = mod as unknown as Mod;
      const result = storageRisk(plan({ accessToken: 'httpOnlyCookie', refreshToken: 'httpOnlyCookie', csrfDefense: 'fetchMetadata' }));
      expect(result.stealsAccessToken).to.not.include('csrf');
    },
  },
  {
    name: 'TokenHolder: a 200 on the first call never triggers refresh',
    run: async ({ mod, render, screen, user, act, expect }) => {
      localStorage.clear();
      sessionStorage.clear();
      const { TokenHolder } = mod as unknown as Mod;
      const api: Api = async () => ({ status: 200, body: 'ok' });
      const refresh: Refresh = async () => {
        throw new Error('refresh should not be called when the first call already succeeds');
      };
      render(<TokenHolder api={api} refresh={refresh} />);
      await act(async () => {
        await user.click(screen.getByRole('button', { name: 'Call API' }));
      });
      expect((await screen.findByTestId('result-status')).textContent).to.equal('200');
      expect(localStorage.length).to.equal(0);
    },
  },
  {
    name: 'TokenHolder: a 401 triggers exactly one refresh, then a successful retry',
    run: async ({ mod, render, screen, user, act, expect }) => {
      localStorage.clear();
      sessionStorage.clear();
      const { TokenHolder, getAccessToken } = mod as unknown as Mod;
      let calls = 0;
      const api: Api = async (token) => {
        calls += 1;
        if (token === 'refreshed-token') return { status: 200, body: 'ok' };
        return { status: 401, body: 'unauthorized' };
      };
      const refresh: Refresh = async () => 'refreshed-token';

      expect(getAccessToken(), 'fresh module evaluation should start with no token').to.equal(null);

      render(<TokenHolder api={api} refresh={refresh} />);
      await act(async () => {
        await user.click(screen.getByRole('button', { name: 'Call API' }));
      });

      expect((await screen.findByTestId('result-status')).textContent).to.equal('200');
      expect(calls, 'expected exactly two api() calls: the initial 401 and the retry').to.equal(2);
      expect(getAccessToken()).to.equal('refreshed-token');
      expect(localStorage.length, 'the token must never be written to localStorage').to.equal(0);
    },
  },
  {
    name: 'TokenHolder: the token is held in memory, never in localStorage or sessionStorage, even after a failed retry',
    run: async ({ mod, render, screen, user, act, expect }) => {
      localStorage.clear();
      sessionStorage.clear();
      const { TokenHolder } = mod as unknown as Mod;
      const api: Api = async () => ({ status: 401, body: 'still unauthorized' });
      const refresh: Refresh = async () => 'still-bad-token';

      render(<TokenHolder api={api} refresh={refresh} />);
      await act(async () => {
        await user.click(screen.getByRole('button', { name: 'Call API' }));
      });

      expect((await screen.findByTestId('result-status')).textContent).to.equal('401');
      expect(localStorage.length).to.equal(0);
      expect(sessionStorage.length).to.equal(0);
    },
  },
];
