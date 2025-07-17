module.exports = {
  "preset": "ts-jest",
  "testEnvironment": "node",
  "roots": [
    "<rootDir>/src"
  ],
  "testMatch": [
    "**/__tests__/**/*.test.ts",
    "**/__tests__/**/*.test.tsx"
  ],
  "transform": {
    "^.+\\.tsx?$": "ts-jest"
  },
  "moduleNameMapping": {
    "^@/(.*)$": "<rootDir>/src/$1"
  },
  "setupFilesAfterEnv": [
    "<rootDir>/src/__tests__/setup.ts"
  ],
  "testTimeout": 30000,
  "maxWorkers": 1,
  "forceExit": true,
  "clearMocks": true,
  "collectCoverageFrom": [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/__tests__/**/*",
    "!src/types/**/*"
  ],
  "coverageDirectory": "coverage",
  "coverageReporters": [
    "text",
    "lcov",
    "html"
  ]
};