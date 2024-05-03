//
// Description: This file contains the log utility functions.
// The log utility functions are used to log messages to the console.
// IMPORTANT: to avoid circular dependencies, the log utility functions
//            should not import any other files.
//

const isRunningInCI = () => {
  return (
    !!process.env.GITHUB_ACTIONS ||
    !!process.env.TRAVIS ||
    !!process.env.CIRCLECI ||
    !!process.env.GITLAB_CI ||
    !!process.env.APPVEYOR
  );
};

// flag to determine if we are running in CI
const _isCI = isRunningInCI();

const pad = (str, length, separator) => {
  if (str.length === 0 || str.length >= length) return str;
  const d = length - str.length;
  const m = d % 2;
  const p = (d - m) / 2;
  return str.padStart(str.length + p, separator).padEnd(length, separator);
};

const getPrefix = (level) => {
  // only print timestamp if not running in CI, CI have their own timestamps
  const timestamp = _isCI ? "" : `[${new Date().toISOString()}] `;
  // second argument is max possible length of log level string
  level = pad(level, 5, " ");
  return `${timestamp}[${level}] :`
};

const info = (...args) => {
  const prefix = getPrefix("INFO");
  console.log(prefix, ...args);
};

const error = (...args) => {
  const prefix = getPrefix("ERROR");
  console.error(prefix, ...args);
};

const debug = (...args) => {
  if (!!process.env.DEBUG && process.env.DEBUG === "true") {
    const prefix = getPrefix("DEBUG");
    console.log(prefix, ...args);
  }
};

module.exports = {
  info,
  error,
  debug,
};
