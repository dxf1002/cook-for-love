const PREFIX = '[MiniApp]';

export const logger = {
  log(...args: unknown[]): void {
    // eslint-disable-next-line no-console
    console.log(PREFIX, ...args);
  },
  info(...args: unknown[]): void {
    // eslint-disable-next-line no-console
    console.info(PREFIX, ...args);
  },
  warn(...args: unknown[]): void {
    // eslint-disable-next-line no-console
    console.warn(PREFIX, ...args);
  },
  error(...args: unknown[]): void {
    // eslint-disable-next-line no-console
    console.error(PREFIX, ...args);
  },
  debug(...args: unknown[]): void {
    // eslint-disable-next-line no-console
    console.debug(PREFIX, ...args);
  },
};
