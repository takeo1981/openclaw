import {
  DEFAULT_ACCOUNT_ID,
  normalizeAccountId,
  resolveAccountEntry,
  type OpenClawConfig,
  type DiscordAccountConfig,
  type DiscordActionConfig,
} from "./runtime-api.js";
import { resolveDiscordToken } from "./token.js";

function createAccountActionGate<T extends Record<string, boolean | undefined>>(params: {
  baseActions?: T;
  accountActions?: T;
}): (key: keyof T, defaultValue?: boolean) => boolean {
  return (key, defaultValue = true) => {
    const accountValue = params.accountActions?.[key];
    if (accountValue !== undefined) {
      return accountValue;
    }
    const baseValue = params.baseActions?.[key];
    if (baseValue !== undefined) {
      return baseValue;
    }
    return defaultValue;
  };
}

export type ResolvedDiscordAccount = {
  accountId: string;
  enabled: boolean;
  name?: string;
  token: string;
  tokenSource: "env" | "config" | "none";
  config: DiscordAccountConfig;
};

function listConfiguredDiscordAccountIds(cfg: OpenClawConfig): string[] {
  const accounts = cfg.channels?.discord?.accounts;
  if (!accounts || typeof accounts !== "object") {
    return [];
  }
  return [
    ...new Set(
      Object.keys(accounts)
        .filter(Boolean)
        .map((id) => normalizeAccountId(id)),
    ),
  ];
}

export function listDiscordAccountIds(cfg: OpenClawConfig): string[] {
  const ids = listConfiguredDiscordAccountIds(cfg);
  if (ids.length === 0) {
    return [DEFAULT_ACCOUNT_ID];
  }
  return ids.toSorted((a, b) => a.localeCompare(b));
}

export function resolveDefaultDiscordAccountId(cfg: OpenClawConfig): string {
  const preferred = cfg.channels?.discord?.defaultAccount;
  const normalizedPreferred = typeof preferred === "string" ? normalizeAccountId(preferred) : "";
  if (normalizedPreferred) {
    const ids = listDiscordAccountIds(cfg);
    if (ids.includes(normalizedPreferred)) {
      return normalizedPreferred;
    }
  }
  const ids = listDiscordAccountIds(cfg);
  if (ids.includes(DEFAULT_ACCOUNT_ID)) {
    return DEFAULT_ACCOUNT_ID;
  }
  return ids[0] ?? DEFAULT_ACCOUNT_ID;
}

export function resolveDiscordAccountConfig(
  cfg: OpenClawConfig,
  accountId: string,
): DiscordAccountConfig | undefined {
  return resolveAccountEntry(cfg.channels?.discord?.accounts, accountId);
}

export function mergeDiscordAccountConfig(
  cfg: OpenClawConfig,
  accountId: string,
): DiscordAccountConfig {
  const { accounts: _ignored, ...base } = (cfg.channels?.discord ?? {}) as DiscordAccountConfig & {
    accounts?: unknown;
  };
  const account = resolveDiscordAccountConfig(cfg, accountId) ?? {};
  return { ...base, ...account };
}

export function createDiscordActionGate(params: {
  cfg: OpenClawConfig;
  accountId?: string | null;
}): (key: keyof DiscordActionConfig, defaultValue?: boolean) => boolean {
  const accountId = normalizeAccountId(params.accountId);
  return createAccountActionGate({
    baseActions: params.cfg.channels?.discord?.actions,
    accountActions: resolveDiscordAccountConfig(params.cfg, accountId)?.actions,
  });
}

export function resolveDiscordAccount(params: {
  cfg: OpenClawConfig;
  accountId?: string | null;
}): ResolvedDiscordAccount {
  const accountId = normalizeAccountId(params.accountId);
  const baseEnabled = params.cfg.channels?.discord?.enabled !== false;
  const merged = mergeDiscordAccountConfig(params.cfg, accountId);
  const accountEnabled = merged.enabled !== false;
  const enabled = baseEnabled && accountEnabled;
  const tokenResolution = resolveDiscordToken(params.cfg, { accountId });
  return {
    accountId,
    enabled,
    name: merged.name?.trim() || undefined,
    token: tokenResolution.token,
    tokenSource: tokenResolution.source,
    config: merged,
  };
}

export function resolveDiscordMaxLinesPerMessage(params: {
  cfg: OpenClawConfig;
  discordConfig?: DiscordAccountConfig | null;
  accountId?: string | null;
}): number | undefined {
  if (typeof params.discordConfig?.maxLinesPerMessage === "number") {
    return params.discordConfig.maxLinesPerMessage;
  }
  return resolveDiscordAccount({
    cfg: params.cfg,
    accountId: params.accountId,
  }).config.maxLinesPerMessage;
}

export function listEnabledDiscordAccounts(cfg: OpenClawConfig): ResolvedDiscordAccount[] {
  return listDiscordAccountIds(cfg)
    .map((accountId) => resolveDiscordAccount({ cfg, accountId }))
    .filter((account) => account.enabled);
}
