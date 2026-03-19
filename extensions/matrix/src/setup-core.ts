import {
  DEFAULT_ACCOUNT_ID,
  normalizeAccountId,
  prepareScopedSetupConfig,
  type ChannelSetupAdapter,
} from "openclaw/plugin-sdk/setup";
import { updateMatrixAccountConfig } from "./matrix/config-update.js";
import { applyMatrixSetupAccountConfig, validateMatrixSetupInput } from "./setup-config.js";
import type { CoreConfig } from "./types.js";

const channel = "matrix" as const;

export function buildMatrixConfigUpdate(
  cfg: CoreConfig,
  input: {
    homeserver?: string;
    userId?: string;
    accessToken?: string;
    password?: string;
    deviceName?: string;
    initialSyncLimit?: number;
  },
): CoreConfig {
  return updateMatrixAccountConfig(cfg, DEFAULT_ACCOUNT_ID, {
    enabled: true,
    homeserver: input.homeserver,
    userId: input.userId,
    accessToken: input.accessToken,
    password: input.password,
    deviceName: input.deviceName,
    initialSyncLimit: input.initialSyncLimit,
  });
}

export const matrixSetupAdapter: ChannelSetupAdapter = {
  resolveAccountId: ({ accountId }) => normalizeAccountId(accountId),
  applyAccountName: ({ cfg, accountId, name }) =>
    prepareScopedSetupConfig({
      cfg: cfg as CoreConfig,
      channelKey: channel,
      accountId,
      name,
    }) as CoreConfig,
  validateInput: ({ accountId, input }) => validateMatrixSetupInput({ accountId, input }),
  applyAccountConfig: ({ cfg, accountId, input }) =>
    applyMatrixSetupAccountConfig({
      cfg: cfg as CoreConfig,
      accountId,
      input,
    }),
};
