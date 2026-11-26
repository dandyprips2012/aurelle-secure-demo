const fs = require("fs");
const path = require("path");
const pino = require("pino");

// JSON log lines go to stdout and to a file the Datadog Agent tails (see the Agent's storefront_api.d config).
// With DD_LOGS_INJECTION=true, dd-trace adds dd.trace_id / dd.span_id to every line, so logs link to traces.
const logDir = process.env.LOG_DIR || path.join(__dirname, "logs");
fs.mkdirSync(logDir, { recursive: true });

const logger = pino(
  {
    level: process.env.LOG_LEVEL || "info",
    formatters: { level: (label) => ({ level: label }) },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  pino.multistream([
    { stream: process.stdout },
    { stream: pino.destination({ dest: path.join(logDir, "app.log"), sync: false, mkdir: true }) },
  ])
);

module.exports = logger;
