// deno-lint-ignore-file
import type { PluginContext, Tool, ToolCallResult } from 'cortex/plugins';

let config: Record<string, string> = {};

export async function onLoad(ctx: PluginContext): Promise<void> {
  ctx.logger.info(`[cortex-plugin-docker] Loaded`);
  config = {
    dockerHost: (await ctx.config.get('dockerHost')) ?? 'unix:///var/run/docker.sock',
    dockerRegistry: (await ctx.config.get('dockerRegistry')) ?? '',
    kubeconfigPath: (await ctx.config.get('kubeconfigPath')) ?? '~/.kube/config',
    defaultNamespace: (await ctx.config.get('defaultNamespace')) ?? 'default',
  };
}

export async function onUnload(_ctx: PluginContext): Promise<void> {}

const docker_list: Tool = {
  definition: {
    name: 'docker_list',
    description: 'List containers',
    params: [
      {
        name: 'all',
        type: 'boolean',
        description: 'Show all containers (including stopped)',
        required: false,
      },
      {
        name: 'filter',
        type: 'string',
        description: 'Filter by status: running, stopped, all',
        required: false,
      },
    ],
    capabilities: ['shell:run'],
  },
  execute: async (args: Record<string, unknown>, _ctx: PluginContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const all = args.all ?? false;
      const filter = (args.filter as string) ?? 'all';
      const cmdArgs = ['ps'];
      if (all) cmdArgs.push('--all');
      if (filter === 'running') cmdArgs.push('--filter', 'status=running');
      else if (filter === 'stopped') cmdArgs.push('--filter', 'status=exited');

      const p = new Deno.Command('docker', { args: cmdArgs });
      const { stdout, stderr } = await p.output();
      const output = new TextDecoder().decode(stdout);

      if (!output.trim()) {
        return {
          toolName: 'docker_list',
          success: true,
          output: 'No containers found.',
          durationMs: Date.now() - start,
        };
      }
      return { toolName: 'docker_list', success: true, output, durationMs: Date.now() - start };
    } catch (error) {
      return {
        toolName: 'docker_list',
        success: false,
        output: '',
        error: `Failed to list containers: ${
          error instanceof Error ? error.message : String(error)
        }`,
        durationMs: Date.now() - start,
      };
    }
  },
};

const docker_run: Tool = {
  definition: {
    name: 'docker_run',
    description: 'Run a container',
    params: [
      { name: 'image', type: 'string', description: 'Docker image to run', required: true },
      { name: 'name', type: 'string', description: 'Container name', required: false },
      {
        name: 'ports',
        type: 'string',
        description: 'Port mapping (e.g. 8080:80)',
        required: false,
      },
      {
        name: 'env_vars',
        type: 'string',
        description: 'Environment variables as JSON',
        required: false,
      },
      { name: 'command', type: 'string', description: 'Override default command', required: false },
      {
        name: 'detach',
        type: 'boolean',
        description: 'Run container in background',
        required: false,
      },
    ],
    capabilities: ['shell:run'],
  },
  execute: async (args: Record<string, unknown>, _ctx: PluginContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const image = args.image as string;
      if (!image || typeof image !== 'string') {
        return {
          toolName: 'docker_run',
          success: false,
          output: '',
          error: 'Image name is required',
          durationMs: Date.now() - start,
        };
      }
      const cmdArgs = ['run'];
      if (args.detach) cmdArgs.push('--detach');
      if (args.name) cmdArgs.push('--name', args.name as string);
      if (args.ports) cmdArgs.push('-p', args.ports as string);
      if (args.env_vars) {
        try {
          const envObj = JSON.parse(args.env_vars as string);
          for (const [k, v] of Object.entries(envObj)) {
            cmdArgs.push('-e', `${k}=${v}`);
          }
        } catch {
          return {
            toolName: 'docker_run',
            success: false,
            output: '',
            error: 'Invalid env_vars JSON',
            durationMs: Date.now() - start,
          };
        }
      }
      cmdArgs.push(image);
      if (args.command) cmdArgs.push(args.command as string);

      const p = new Deno.Command('docker', { args: cmdArgs });
      const { stdout, stderr } = await p.output();
      const output = new TextDecoder().decode(stdout);
      const err = new TextDecoder().decode(stderr);
      if (err) {
        return {
          toolName: 'docker_run',
          success: false,
          output: '',
          error: err,
          durationMs: Date.now() - start,
        };
      }
      return {
        toolName: 'docker_run',
        success: true,
        output: output.trim() || `Container started: ${image}`,
        durationMs: Date.now() - start,
      };
    } catch (error) {
      return {
        toolName: 'docker_run',
        success: false,
        output: '',
        error: `Failed to run container: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - start,
      };
    }
  },
};

const docker_logs: Tool = {
  definition: {
    name: 'docker_logs',
    description: 'Get container logs',
    params: [
      { name: 'container_id', type: 'string', description: 'Container ID or name', required: true },
      { name: 'tail', type: 'number', description: 'Number of lines to show', required: false },
      { name: 'follow', type: 'boolean', description: 'Follow log output', required: false },
    ],
    capabilities: ['shell:run'],
  },
  execute: async (args: Record<string, unknown>, _ctx: PluginContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const containerId = args.container_id as string;
      if (!containerId) {
        return {
          toolName: 'docker_logs',
          success: false,
          output: '',
          error: 'Container ID is required',
          durationMs: Date.now() - start,
        };
      }
      const tail = (args.tail as number) ?? 100;
      const cmdArgs = ['logs', '--tail', String(tail)];
      if (args.follow) cmdArgs.push('--follow');
      cmdArgs.push(containerId);

      const p = new Deno.Command('docker', { args: cmdArgs });
      const { stdout, stderr } = await p.output();
      const output = new TextDecoder().decode(stdout);
      if (!output.trim()) {
        return {
          toolName: 'docker_logs',
          success: true,
          output: '(no log output)',
          durationMs: Date.now() - start,
        };
      }
      return { toolName: 'docker_logs', success: true, output, durationMs: Date.now() - start };
    } catch (error) {
      return {
        toolName: 'docker_logs',
        success: false,
        output: '',
        error: `Failed to get logs: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - start,
      };
    }
  },
};

const docker_stop: Tool = {
  definition: {
    name: 'docker_stop',
    description: 'Stop container',
    params: [
      { name: 'container_id', type: 'string', description: 'Container ID or name', required: true },
      { name: 'force', type: 'boolean', description: 'Force stop the container', required: false },
    ],
    capabilities: ['shell:run'],
  },
  execute: async (args: Record<string, unknown>, _ctx: PluginContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const containerId = args.container_id as string;
      if (!containerId) {
        return {
          toolName: 'docker_stop',
          success: false,
          output: '',
          error: 'Container ID is required',
          durationMs: Date.now() - start,
        };
      }
      const cmdArgs = args.force ? ['rm', '-f', containerId] : ['stop', containerId];
      const p = new Deno.Command('docker', { args: cmdArgs });
      const { stdout, stderr } = await p.output();
      const err = new TextDecoder().decode(stderr);
      if (err && !err.includes(containerId)) {
        return {
          toolName: 'docker_stop',
          success: false,
          output: '',
          error: err,
          durationMs: Date.now() - start,
        };
      }
      return {
        toolName: 'docker_stop',
        success: true,
        output: `Container ${containerId} stopped`,
        durationMs: Date.now() - start,
      };
    } catch (error) {
      return {
        toolName: 'docker_stop',
        success: false,
        output: '',
        error: `Failed to stop container: ${
          error instanceof Error ? error.message : String(error)
        }`,
        durationMs: Date.now() - start,
      };
    }
  },
};

const k8s_get_pods: Tool = {
  definition: {
    name: 'k8s_get_pods',
    description: 'Get Kubernetes pods',
    params: [
      { name: 'namespace', type: 'string', description: 'Kubernetes namespace', required: false },
      {
        name: 'label_selector',
        type: 'string',
        description: 'Label selector filter',
        required: false,
      },
    ],
    capabilities: ['shell:run'],
  },
  execute: async (args: Record<string, unknown>, _ctx: PluginContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const namespace = (args.namespace as string) ?? config.defaultNamespace ?? 'default';
      const cmdArgs = ['get', 'pods', '-n', namespace];
      if (args.label_selector) cmdArgs.push('-l', args.label_selector as string);

      const p = new Deno.Command('kubectl', { args: cmdArgs });
      const { stdout } = await p.output();
      const output = new TextDecoder().decode(stdout);
      return {
        toolName: 'k8s_get_pods',
        success: true,
        output: output.trim() || 'No pods found',
        durationMs: Date.now() - start,
      };
    } catch (error) {
      return {
        toolName: 'k8s_get_pods',
        success: false,
        output: '',
        error: `Failed to get pods: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - start,
      };
    }
  },
};

const k8s_describe: Tool = {
  definition: {
    name: 'k8s_describe',
    description: 'Describe a K8s resource',
    params: [
      { name: 'resource_type', type: 'string', description: 'Type of resource', required: true },
      { name: 'name', type: 'string', description: 'Resource name', required: true },
      { name: 'namespace', type: 'string', description: 'Kubernetes namespace', required: false },
    ],
    capabilities: ['shell:run'],
  },
  execute: async (args: Record<string, unknown>, _ctx: PluginContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const resourceType = args.resource_type as string;
      const name = args.name as string;
      const namespace = (args.namespace as string) ?? config.defaultNamespace ?? 'default';
      if (!resourceType || !name) {
        return {
          toolName: 'k8s_describe',
          success: false,
          output: '',
          error: 'resource_type and name are required',
          durationMs: Date.now() - start,
        };
      }
      const validResources = ['pod', 'deployment', 'service', 'node'];
      if (!validResources.includes(resourceType)) {
        return {
          toolName: 'k8s_describe',
          success: false,
          output: '',
          error: `Invalid resource_type: ${resourceType}. Valid: ${validResources.join(', ')}`,
          durationMs: Date.now() - start,
        };
      }

      const cmdArgs = ['describe', resourceType, name, '-n', namespace];
      const p = new Deno.Command('kubectl', { args: cmdArgs });
      const { stdout } = await p.output();
      const output = new TextDecoder().decode(stdout);
      return { toolName: 'k8s_describe', success: true, output, durationMs: Date.now() - start };
    } catch (error) {
      return {
        toolName: 'k8s_describe',
        success: false,
        output: '',
        error: `Failed to describe: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - start,
      };
    }
  },
};

export const tools: Tool[] = [
  docker_list,
  docker_run,
  docker_logs,
  docker_stop,
  k8s_get_pods,
  k8s_describe,
];
