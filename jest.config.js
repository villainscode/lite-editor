module.exports = {
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['js'],
  moduleNameMapper: {
    "\\.(css|less|scss)$": "<rootDir>/tests/mocks/styleMock.js"
  },
  setupFiles: ['<rootDir>/tests/setupGlobals.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setupTests.js'],
  testMatch: [
    "**/tests/**/*.test.js",
    "**/tests/**/*.spec.js"
  ],
  collectCoverageFrom: [
    "plugins/**/*.js",
    "js/**/*.js",
    "!**/node_modules/**"
  ],
  coverageReporters: ['text', 'lcov', 'clover'],
  testPathIgnorePatterns: [
    "/node_modules/"
  ]
};
