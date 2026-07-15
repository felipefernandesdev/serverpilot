/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages', '<rootDir>/apps'],
  testMatch: ['**/__tests__/**/*.ts', '**/*.spec.ts'],
  moduleNameMapper: {
    '^@serverpilot/domain$': '<rootDir>/packages/domain/src',
    '^@serverpilot/domain/(.*)$': '<rootDir>/packages/domain/src/$1',
    '^@serverpilot/use-cases$': '<rootDir>/packages/use-cases/src',
    '^@serverpilot/use-cases/(.*)$': '<rootDir>/packages/use-cases/src/$1',
    '^@serverpilot/infra$': '<rootDir>/packages/infra/src',
    '^@serverpilot/infra/(.*)$': '<rootDir>/packages/infra/src/$1',
    '^@serverpilot/shared$': '<rootDir>/packages/shared/src',
    '^@serverpilot/shared/(.*)$': '<rootDir>/packages/shared/src/$1',
  },
  collectCoverageFrom: [
    'packages/*/src/**/*.ts',
    'apps/*/src/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
