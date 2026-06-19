// deno-lint-ignore-file require-await
import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { tools } from '../../mod.ts';
import type { PluginContext, ToolContext } from '../../types.ts';

// Mock PluginContext
const mockContext: PluginContext & ToolContext = {
  pluginId: 'cortex-plugin-docker',
  pluginDir: '/tmp/plugins/cortex-plugin-docker',
  state: {
    get: async () => null,
    set: async () => {},
    delete: async () => {},
    list: async () => ({}),
  },
  config: {
    get: async () => null,
    set: async () => {},
    getAll: async () => ({}),
  },
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  },
  host: {
    registerTool: () => {},
    unregisterTool: () => {},
  },
  sessionId: 'test-session',
  workingDir: '/tmp',
  agentId: 'test-agent',
  workspaceDir: '/tmp',
};

function findTool(name: string) {
  const tool = tools.find((t) => t.definition.name === name);
  if (!tool) throw new Error(`Tool "${name}" not found`);
  return tool;
}

Deno.test('tools array — exports all tools', () => {
  assertEquals(tools.length, 5);
  assertEquals(tools[0].definition.name, 'docker_list');
  assertEquals(tools[1].definition.name, 'docker_run');
  assertEquals(tools[2].definition.name, 'docker_logs');
  assertEquals(tools[3].definition.name, 'docker_stop');
  assertEquals(tools[4].definition.name, 'k8s_get_pods');
});

Deno.test('docker_list — tool is defined with name and description', () => {
  const tool = findTool('docker_list');
  assertEquals(typeof tool.definition.description, 'string');
  assertEquals(tool.definition.description.length > 0, true);
});

Deno.test('docker_run — rejects empty image', async () => {
  const tool = findTool('docker_run');
  const result = await tool.execute({ 'image': '' }, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error ?? '', 'non-empty string');
});

Deno.test('docker_logs — rejects empty container_id', async () => {
  const tool = findTool('docker_logs');
  const result = await tool.execute({ 'container_id': '' }, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error ?? '', 'non-empty string');
});

Deno.test('docker_stop — rejects empty container_id', async () => {
  const tool = findTool('docker_stop');
  const result = await tool.execute({ 'container_id': '' }, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error ?? '', 'non-empty string');
});

Deno.test('k8s_get_pods — tool is defined with name and description', () => {
  const tool = findTool('k8s_get_pods');
  assertEquals(typeof tool.definition.description, 'string');
  assertEquals(tool.definition.description.length > 0, true);
});

Deno.test('all tools return durationMs', async () => {
  for (const tool of tools) {
    const args: Record<string, unknown> = {};
    const result = await tool.execute(args, mockContext);
    assertEquals(typeof result.durationMs, 'number');
    assertEquals(result.durationMs >= 0, true);
  }
});
