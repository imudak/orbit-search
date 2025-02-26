/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@workers/(.*)$': '<rootDir>/src/workers/$1'
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      useESM: true
    }],
  },
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.cjs',
    '<rootDir>/src/__tests__/integration/setup.ts'
  ],
  testMatch: [
    '<rootDir>/src/__tests__/**/*.test.ts',
    '<rootDir>/src/__tests__/**/*.test.tsx'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/dist/',
    '\\.mock\\.ts$'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transformIgnorePatterns: [
    'node_modules/(?!(@testing-library|axios|idb)/)'
  ],
  testEnvironmentOptions: {
    url: 'https://celestrak-proxy.imudak.workers.dev',
    referrer: 'https://celestrak-proxy.imudak.workers.dev',
    resources: 'usable',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    customExportConditions: ['node', 'node-addons']
  }
};
