import type { GitHubAppConfig } from "../types";

export async function handleGitHubStatus(_request: Request, env: any): Promise<Response> {
  const url = new URL(_request.url);
  const appId = url.searchParams.get('app_id');

  // If no app_id provided, return general system status
  if (!appId) {
    try {
      // Check GitHub App configuration
      const githubConfigId = (env.GITHUB_APP_CONFIG as any).idFromName('github-app-config');
      const githubConfigDO = (env.GITHUB_APP_CONFIG as any).get(githubConfigId);
      const githubConfigResponse = await githubConfigDO.fetch(new Request('http://internal/get'));
      const githubConfig = await githubConfigResponse.json().catch(() => null);
      const githubAppConfigured = !!githubConfig && !!githubConfig.appId;

      // Check Claude configuration
      const claudeConfigId = (env.GITHUB_APP_CONFIG as any).idFromName('claude-config');
      const claudeConfigDO = (env.GITHUB_APP_CONFIG as any).get(claudeConfigId);
      const claudeConfigResponse = await claudeConfigDO.fetch(new Request('http://internal/get-claude-key'));
      const claudeConfig = await claudeConfigResponse.json().catch(() => null);
      const claudeConfigured = !!claudeConfig && !!claudeConfig.anthropicApiKey;

      const repositoryCount = githubConfig?.repositories?.length || 0;

      const status = {
        githubAppConfigured,
        claudeConfigured,
        repositoryCount,
        appId: githubConfig?.appId || null,
        installationId: githubConfig?.installationId || null,
        owner: githubConfig?.owner?.login || null,
        ready: githubAppConfigured && claudeConfigured
      };

      return new Response(JSON.stringify(status, null, 2), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error fetching system status:', error);
      return new Response(JSON.stringify({
        githubAppConfigured: false,
        claudeConfigured: false,
        repositoryCount: 0,
        ready: false
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // With app_id, return specific app configuration
  try {
    const id = (env.GITHUB_APP_CONFIG as any).idFromName(appId);
    const configDO = (env.GITHUB_APP_CONFIG as any).get(id);

    const response = await configDO.fetch(new Request('http://internal/get'));
    const config = await response.json() as GitHubAppConfig | null;

    if (!config) {
      return new Response(JSON.stringify({ error: 'No configuration found for this app ID' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 404
      });
    }

    // Return safe information (without sensitive data)
    const safeConfig = {
      appId: config.appId,
      owner: config.owner,
      repositories: config.repositories,
      permissions: config.permissions,
      events: config.events,
      createdAt: config.createdAt,
      lastWebhookAt: config.lastWebhookAt,
      webhookCount: config.webhookCount,
      installationId: config.installationId,
      hasCredentials: !!(config.privateKey && config.webhookSecret)
    };

    return new Response(JSON.stringify(safeConfig, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching GitHub status:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
}