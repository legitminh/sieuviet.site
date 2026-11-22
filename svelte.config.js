import adapter from '@sveltejs/adapter-static';

const rawBase = process.argv.includes('dev') ? '' : (process.env.BASE_PATH ?? '/sieuviet.site');
const base = rawBase && rawBase !== '/' ? `/${rawBase.replace(/^\/+|\/+$/g, '')}` : '';

export default {
  kit: {
    adapter: adapter({ fallback: '404.html' }),
    paths: { base }
  }
};
