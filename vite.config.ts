import {defineConfig} from 'vite';
import vinext from 'vinext';
import {cloudflare} from '@cloudflare/vite-plugin';

// Standalone Cloudflare Workers: no Sites preview worker, D1 or R2 bindings.
export default defineConfig({
  server: { allowedHosts: ['terminal.local'] },
 plugins:[
  vinext(),
  cloudflare({viteEnvironment:{name:'rsc',childEnvironments:['ssr']},inspectorPort:false})
 ]
});
