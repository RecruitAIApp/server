const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const CURRENT_LOG_LEVEL =
  process.env.LOG_LEVEL ||
  (process.env.NODE_ENV === "production" ? "info" : "debug");

function formatMessage(level, message, meta) {
  const timestamp = new Date().toISOString();
  if (process.env.NODE_ENV === "production") {
    return JSON.stringify({
      timestamp,
      level: level.toUpperCase(),
      message,
      ...meta,
    });
  } else {
    const colors = {
      debug: "\x1b[36m", // Cyan
      info: "\x1b[32m",  // Green
      warn: "\x1b[33m",  // Yellow
      error: "\x1b[31m", // Red
    };
    const color = colors[level] || "";
    const reset = "\x1b[0m";
    const metaStr =
      meta && Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : "";
    return `${color}[${timestamp}] [${level.toUpperCase()}]${reset} ${message}${metaStr}`;
  }
}

class Logger {
  constructor(context) {
    this.context = context;
  }

  log(level, message, meta = {}) {
    if (LOG_LEVELS[level] < LOG_LEVELS[CURRENT_LOG_LEVEL]) return;
    const output = formatMessage(level, message, {
      context: this.context,
      ...meta,
    });
    if (level === "error") {
      console.error(output);
    } else if (level === "warn") {
      console.warn(output);
    } else {
      console.log(output);
    }
  }

  debug(message, meta) {
    this.log("debug", message, meta);
  }

  info(message, meta) {
    this.log("info", message, meta);
  }

  warn(message, meta) {
    this.log("warn", message, meta);
  }

  error(message, meta) {
    let metaPayload = meta;
    if (meta instanceof Error) {
      metaPayload = { error: meta.message, stack: meta.stack };
    } else if (meta && meta.error instanceof Error) {
      metaPayload = {
        ...meta,
        error: meta.error.message,
        stack: meta.error.stack,
      };
    }
    this.log("error", message, metaPayload);
  }
}

export const createLogger = (context) => new Logger(context);
export default createLogger("app");
