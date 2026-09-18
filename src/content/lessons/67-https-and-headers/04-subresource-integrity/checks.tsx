import type { Check } from '../../../types';

type Algorithm = 'sha256' | 'sha384' | 'sha512';

type Mod = {
  sriIntegrity: (content: string, algorithm?: Algorithm) => Promise<string>;
  verifyIntegrity: (content: string, integrityAttr: string) => Promise<boolean>;
  scriptTagFor: (url: string, content: string) => Promise<string>;
};

// Precomputed vectors for the fixed string 'console.log(1);', verified
// independently via Node's crypto.createHash and via crypto.subtle.digest.
const CONTENT = 'console.log(1);';
const TAMPERED = 'console.log(2);';
const SHA256 = 'NcFG924SlHfGQGG8hFEeEJDz1NgFlxPmZj3Us1sfdkI=';
const SHA384 = 'JawyHuhqEMFMvdtX+VHylbI0hfJp2F7nvwFVRqqfuOoK5oW7TG/7V11Zs7zeFWIE';
const SHA512 = '3kzPWiJlVB3eWYw312fMVj7vrzd//tu5OIJrYJ0sDBAFrGqCI1jSh6qXgkrJCdPc8lxexQXKdbHXnhHIHx92GA==';

export const checks: Check[] = [
  {
    name: 'sriIntegrity defaults to sha384 and matches the known vector',
    run: async ({ mod, expect }) => {
      const { sriIntegrity } = mod as unknown as Mod;
      const result = await sriIntegrity(CONTENT);
      expect(result).to.equal(`sha384-${SHA384}`);
    },
  },
  {
    name: 'sriIntegrity supports sha256 and matches the known vector',
    run: async ({ mod, expect }) => {
      const { sriIntegrity } = mod as unknown as Mod;
      const result = await sriIntegrity(CONTENT, 'sha256');
      expect(result).to.equal(`sha256-${SHA256}`);
    },
  },
  {
    name: 'verifyIntegrity accepts a single hash that matches the content',
    run: async ({ mod, expect }) => {
      const { verifyIntegrity } = mod as unknown as Mod;
      expect(await verifyIntegrity(CONTENT, `sha384-${SHA384}`)).to.equal(true);
    },
  },
  {
    name: 'verifyIntegrity rejects tampered content against the original hash',
    run: async ({ mod, expect }) => {
      const { verifyIntegrity } = mod as unknown as Mod;
      expect(await verifyIntegrity(TAMPERED, `sha384-${SHA384}`)).to.equal(false);
    },
  },
  {
    name: 'verifyIntegrity checks the strongest algorithm present, not the first listed',
    run: async ({ mod, expect }) => {
      const { verifyIntegrity } = mod as unknown as Mod;
      // A weak, deliberately-wrong sha256 hash is listed FIRST, followed by
      // the real sha512 hash. A correct implementation ignores the weak
      // one entirely and verifies against sha512, so this should be true --
      // an implementation that trusts whichever algorithm comes first would
      // wrongly return false here.
      const integrityAttr = `sha256-ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ= sha512-${SHA512}`;
      expect(await verifyIntegrity(CONTENT, integrityAttr)).to.equal(true);
    },
  },
  {
    name: 'verifyIntegrity still rejects content when even the strongest hash present is wrong',
    run: async ({ mod, expect }) => {
      const { verifyIntegrity } = mod as unknown as Mod;
      const integrityAttr = `sha256-${SHA256} sha512-ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ==`;
      expect(await verifyIntegrity(CONTENT, integrityAttr)).to.equal(false);
    },
  },
  {
    name: 'scriptTagFor renders src, integrity, and crossorigin="anonymous"',
    run: async ({ mod, expect }) => {
      const { scriptTagFor } = mod as unknown as Mod;
      const tag = await scriptTagFor('https://cdn.example.com/lib.js', CONTENT);
      expect(tag).to.include('src="https://cdn.example.com/lib.js"');
      expect(tag).to.include(`integrity="sha384-${SHA384}"`);
      expect(tag).to.include('crossorigin="anonymous"');
    },
  },
];
