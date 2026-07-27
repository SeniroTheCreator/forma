import pino from "pino";
import { env } from "@/lib/config/env";

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: ["password", "token", "authorization", "*.password", "*.token"],
});
