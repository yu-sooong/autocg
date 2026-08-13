import fs from "node:fs";
import { AUTH_STATE } from "../paths";
import { MockDiscoveryProvider } from "./mock";
import { PlaywrightDiscoveryProvider } from "./playwright";
import { ThreadsApiDiscoveryProvider } from "../threads/api-discovery";
import { MockSendProvider, PlaywrightSendProvider } from "./send";
import { ThreadsApiSendProvider } from "../threads/api-send";
import type { DiscoveryProvider, SendProvider } from "./types";

export function isMockMode() {
  return process.env.MOCK_MODE !== "false";
}

export function getDiscoveryProvider(): DiscoveryProvider {
  const forced = process.env.DISCOVERY_PROVIDER;
  if (forced === "api") return new ThreadsApiDiscoveryProvider();
  if (forced === "playwright") return new PlaywrightDiscoveryProvider();
  if (forced === "mock" || isMockMode()) return new MockDiscoveryProvider();

  if (process.env.THREADS_ACCESS_TOKEN) return new ThreadsApiDiscoveryProvider();
  if (fs.existsSync(AUTH_STATE)) return new PlaywrightDiscoveryProvider();
  return new MockDiscoveryProvider();
}

export function getSendProvider(): SendProvider {
  const forced = process.env.SEND_PROVIDER;
  if (forced === "api") return new ThreadsApiSendProvider();
  if (forced === "playwright") return new PlaywrightSendProvider();
  if (forced === "mock" || isMockMode()) return new MockSendProvider();

  if (process.env.THREADS_ACCESS_TOKEN) return new ThreadsApiSendProvider();
  if (fs.existsSync(AUTH_STATE)) return new PlaywrightSendProvider();
  return new MockSendProvider();
}

export function providerStatus() {
  return {
    mockMode: isMockMode(),
    discovery: getDiscoveryProvider().id,
    send: getSendProvider().id,
    hasThreadsToken: Boolean(process.env.THREADS_ACCESS_TOKEN),
    hasPlaywrightAuth: fs.existsSync(AUTH_STATE),
  };
}
