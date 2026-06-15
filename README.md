# cortex-plugin-docker

Manage containers and clusters with Docker and Kubernetes.

## Installation

```bash
cortex plugin install marketplace:cortex-plugin-docker
cortex plugin install github:CortexPrism/cortex-plugin-docker
cortex plugin install ./manifest.json
```

## Quick Start

```bash
cortex tools list
cortex chat --plugin cortex-plugin-docker
```

## Tools

### docker_list — List containers
- `all` (boolean, default false) — Show all containers
- `filter` (string, optional) — running, stopped, all

### docker_run — Run a container
- `image` (string, required) — Docker image
- `name` (string, optional) — Container name
- `ports` (string, optional) — Port mapping
- `env_vars` (string, optional) — Env vars as JSON
- `command` (string, optional) — Override command
- `detach` (boolean) — Run in background

### docker_logs — Get container logs
- `container_id` (string, required)
- `tail` (number, 100)
- `follow` (boolean)

### docker_stop — Stop container
- `container_id` (string, required)
- `force` (boolean)

### k8s_get_pods — Get Kubernetes pods
- `namespace` (string, default)
- `label_selector` (string)

### k8s_describe — Describe K8s resource
- `resource_type` (enum: pod/deployment/service/node)
- `name` (string, required)
- `namespace` (string)

## Configuration

```json
{
  "plugins": {
    "cortex-plugin-docker": {
      "enabled": true,
      "config": {
        "dockerHost": "unix:///var/run/docker.sock",
        "kubeconfigPath": "~/.kube/config",
        "defaultNamespace": "default"
      }
    }
  }
}
```

## Development

```bash
deno task test
deno task lint
deno task validate
```

## License

MIT
