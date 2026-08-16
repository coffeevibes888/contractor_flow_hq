import nextConfig from 'eslint-config-next';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

export default [
  ...nextConfig,
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      '.next/**',
      '.expo/**',
      '.expo-export-test/**',
      '.expo-test-bundle/**',
      'node_modules/**',
      'public/**',
      'scripts/**',
      'prisma/migrations/**',
    ],
  },
];
