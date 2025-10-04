import createMDX from '@next/mdx';

const withMDX = createMDX({ extension: /\.mdx?$/ });

export default withMDX({
  reactStrictMode: true,
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
});
