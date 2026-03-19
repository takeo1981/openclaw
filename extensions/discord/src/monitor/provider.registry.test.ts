import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  baseConfig,
  baseRuntime,
  getProviderMonitorTestMocks,
  resetDiscordProviderMonitorMocks,
} from "../../../../test/helpers/extensions/discord-provider.test-support.js";

const {
  createDiscordNativeCommandMock,
  clientHandleDeployRequestMock,
  getPluginCommandSpecsMock,
  monitorLifecycleMock,
} = getProviderMonitorTestMocks();

describe("monitorDiscordProvider real plugin registry", () => {
  beforeEach(() => {
    vi.resetModules();
    resetDiscordProviderMonitorMocks({
      nativeCommands: [{ name: "status", description: "Status", acceptsArgs: false }],
    });
    vi.doMock("../probe.js", () => ({
      fetchDiscordApplicationId: async () => "app-1",
    }));
    vi.doMock("../token.js", async (importOriginal) => {
      const actual = await importOriginal<typeof import("../token.js")>();
      return {
        ...actual,
        normalizeDiscordToken: (value?: string) => value,
      };
    });
  });

  it("registers plugin commands from the real registry as native Discord commands", async () => {
    const { clearPluginCommands, getPluginCommandSpecs, registerPluginCommand } =
      await import("../../../../src/plugins/commands.js");
    clearPluginCommands();
    expect(
      registerPluginCommand("demo-plugin", {
        name: "pair",
        description: "Pair device",
        acceptsArgs: true,
        requireAuth: false,
        handler: async ({ args }) => ({ text: `paired:${args ?? ""}` }),
      }),
    ).toEqual({ ok: true });
    getPluginCommandSpecsMock.mockImplementation((provider?: string) =>
      getPluginCommandSpecs(provider),
    );

    const { monitorDiscordProvider } = await import("./provider.js");

    await monitorDiscordProvider({
      config: baseConfig(),
      runtime: baseRuntime(),
    });

    const commandNames = (createDiscordNativeCommandMock.mock.calls as Array<unknown[]>)
      .map((call) => (call[0] as { command?: { name?: string } } | undefined)?.command?.name)
      .filter((value): value is string => typeof value === "string");

    expect(commandNames).toContain("status");
    expect(commandNames).toContain("pair");
    expect(clientHandleDeployRequestMock).toHaveBeenCalledTimes(1);
    expect(monitorLifecycleMock).toHaveBeenCalledTimes(1);
  });
});
