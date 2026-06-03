import { describe, it, expect } from 'vitest';
import { loadConfig, renderLinkSetupConfig } from '../src/config.js';
import { runCli } from '../src/cli.js';
import { CliIo } from '../src/types.js';
import { TabbyClient } from '../src/mcp/client.js';

describe('Configuration loading and link setup', () => {
  it('should use the default endpoint when no config file exists', () => {
    const fsMock = {
      existsSync: () => false,
      readFileSync: () => { throw new Error('File not found'); }
    };
    const config = loadConfig({ env: {}, fsOverride: fsMock });
    expect(config.client.endpoint).toBe('http://127.0.0.1:3301/mcp');
  });

  it('should prioritize TABBYCTL_ENDPOINT environment variable', () => {
    const fsMock = {
      existsSync: () => false,
      readFileSync: () => { throw new Error('File not found'); }
    };
    const config = loadConfig({
      env: { TABBYCTL_ENDPOINT: 'http://custom-endpoint:9999/mcp' },
      fsOverride: fsMock
    });
    expect(config.client.endpoint).toBe('http://custom-endpoint:9999/mcp');
  });

  it('should load configuration from TOML and apply defaults', () => {
    const rawToml = `
[client]
endpoint = "http://my-toml-endpoint:4000/mcp"

[link.default]
ssh_host = "my-host"
`;
    const fsMock = {
      existsSync: () => true,
      readFileSync: () => rawToml
    };
    const config = loadConfig({ env: {}, fsOverride: fsMock });
    expect(config.client.endpoint).toBe('http://my-toml-endpoint:4000/mcp');
    expect(config.link.default).toBeDefined();
    expect(config.link.default.ssh_host).toBe('my-host');
    expect(config.link.default.local_host).toBe('127.0.0.1');
    expect(config.link.default.local_port).toBe(3001);
    expect(config.link.default.remote_host).toBe('127.0.0.1');
    expect(config.link.default.remote_port).toBe(3301);
    expect(config.link.default.backend).toBe('autossh');
  });

  it('should support link setup command and write default config', async () => {
    let writtenPath = '';
    let writtenContent = '';
    
    const fsMock = {
      existsSync: () => false,
      readFileSync: () => { throw new Error('File not found'); },
      mkdirSync: () => {},
      writeFileSync: (p: string, c: string) => {
        writtenPath = p;
        writtenContent = c;
      }
    };
    
    const stdout: string[] = [];
    const stderr: string[] = [];
    const io: CliIo = {
      stdout: (text) => stdout.push(text),
      stderr: (text) => stderr.push(text),
    };
    
    const env = { HOME: '/home/testuser' };
    const config = loadConfig({ env, fsOverride: fsMock });
    const deps = {
      backend: new TabbyClient(config.client.endpoint),
      config,
      fsOverride: fsMock,
      env
    };
    
    const code = await runCli(['link', 'setup', '--host', 'home-server'], deps, io);
    
    expect(code).toBe(0);
    expect(writtenPath).toContain('/home/testuser/.config/tabbyctl/config.toml');
    expect(writtenContent).toContain('ssh_host = "home-server"');
    expect(writtenContent).toContain('backend = "autossh"');
    expect(writtenContent).toContain('endpoint = "http://127.0.0.1:3301/mcp"');
    expect(stdout.join('\n')).toContain('home-server');
    expect(stdout.join('\n')).toContain('config.toml');
  });

  it('should render agent-verifiable default link setup TOML', () => {
    const config = renderLinkSetupConfig('home-server');

    expect(config).toContain('[client]');
    expect(config).toContain('endpoint = "http://127.0.0.1:3301/mcp"');
    expect(config).toContain('[link.default]');
    expect(config).toContain('ssh_host = "home-server"');
    expect(config).toContain('local_host = "127.0.0.1"');
    expect(config).toContain('local_port = 3001');
    expect(config).toContain('remote_host = "127.0.0.1"');
    expect(config).toContain('remote_port = 3301');
    expect(config).toContain('backend = "autossh"');
  });
});
