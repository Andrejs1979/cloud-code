import { logWithContext } from "../log";
import { encrypt } from "../crypto";
import type { GitHubAppManifest, Env } from "../types";

function generateAppManifest(workerDomain: string): GitHubAppManifest {
  return {
    name: `Claude Code on Cloudflare`,
    url: workerDomain,
    hook_attributes: {
      url: `${workerDomain}/webhooks/github`
    },
    redirect_url: `${workerDomain}/install-complete`,
    callback_url: `${workerDomain}/gh-setup/callback`,
    public: false,
    default_permissions: {
      contents: 'write',
      metadata: 'read',
      pull_requests: 'write',
      issues: 'write'
    },
    default_events: [
      'issues'
    ]
  };
}

export async function handleGitHubSetup(_request: Request, origin: string): Promise<Response> {
  logWithContext('GITHUB_SETUP', 'Handling GitHub setup request', { origin });

  const webhookUrl = `${origin}/webhooks/github`;
  const manifest = generateAppManifest(origin);
  const manifestJson = JSON.stringify(manifest);

  logWithContext('GITHUB_SETUP', 'Generated GitHub App manifest', {
    webhookUrl,
    appName: manifest.name
  });

  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>GitHub App Setup - Cloudflare Worker</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 40px auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        .webhook-info {
            background: #f5f5f5;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .webhook-url {
            font-family: monospace;
            background: #fff;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            word-break: break-all;
        }
        .create-app-btn {
            background: #238636;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
            cursor: pointer;
            font-size: 14px;
        }
        .create-app-btn:hover {
            background: #2ea043;
        }
        .steps {
            margin: 30px 0;
        }
        .step {
            margin: 15px 0;
            padding-left: 30px;
            position: relative;
        }
        .step-number {
            position: absolute;
            left: 0;
            top: 0;
            background: #0969da;
            color: white;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>GitHub App Setup</h1>
        <p>Configure GitHub webhook integration for your Cloudflare Worker</p>
    </div>

    <div class="webhook-info">
        <h3>Your Webhook URL</h3>
        <div class="webhook-url">${webhookUrl}</div>
        <p>This URL will receive GitHub webhook events once setup is complete.</p>
    </div>

    <div class="steps">
        <h3>Setup Steps</h3>

        <div class="step">
            <div class="step-number">1</div>
            <strong>Create GitHub App</strong><br>
            Click the button below to create a pre-configured GitHub App with all necessary permissions and webhook settings.
        </div>

        <div class="step">
            <div class="step-number">2</div>
            <strong>Choose Account</strong><br>
            Select which GitHub account or organization should own the app.
        </div>

        <div class="step">
            <div class="step-number">3</div>
            <strong>Install App</strong><br>
            After creation, you'll be guided to install the app on your repositories.
        </div>
    </div>

    <div style="text-align: center; margin: 40px 0;">
        <form action="https://github.com/settings/apps/new" method="post" id="github-app-form">
            <input type="hidden" name="manifest" id="manifest" value="">
            <button type="submit" class="create-app-btn">
                Create GitHub App
            </button>
        </form>
    </div>

    <details>
        <summary>App Configuration Details</summary>
        <pre style="background: #f8f8f8; padding: 15px; border-radius: 4px; overflow-x: auto;">
Permissions:
- Repository contents: read
- Repository metadata: read
- Pull requests: write
- Issues: write

Webhook Events:
- issues
- installation events (automatically enabled)

Webhook URL: ${webhookUrl}
        </pre>
    </details>

    <script>
        // Set the manifest data when the page loads
        document.getElementById('manifest').value = ${JSON.stringify(manifestJson)};
    </script>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}

/**
 * Handle re-encrypt page - shows form to enter credentials
 */
export async function handleReEncryptPage(): Promise<Response> {
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Re-encrypt GitHub Credentials</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 700px;
            margin: 40px auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
        }
        .warning {
            background: #fff8c5;
            border: 1px solid #fbbc04;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .form-group {
            margin: 20px 0;
        }
        label {
            display: block;
            font-weight: 600;
            margin-bottom: 5px;
        }
        textarea, input[type="text"] {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-family: monospace;
            font-size: 12px;
            box-sizing: border-box;
        }
        textarea {
            min-height: 150px;
        }
        .btn {
            background: #238636;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            font-size: 14px;
        }
        .btn:hover {
            background: #2ea043;
        }
        .btn-secondary {
            background: #6e7781;
            margin-left: 10px;
        }
        .btn-secondary:hover {
            background: #57606a;
        }
        .result {
            margin-top: 20px;
            padding: 15px;
            border-radius: 6px;
            display: none;
        }
        .result.success {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
        }
        .result.error {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
        }
    </style>
</head>
<body>
    <h1>Re-encrypt GitHub Credentials</h1>

    <div class="warning">
        <strong>Why is this needed?</strong><br>
        The ENCRYPTION_KEY secret has changed, and the stored GitHub credentials need to be re-encrypted.
        You can find your credentials in your GitHub App settings:
        <a href="https://github.com/settings/apps" target="_blank">https://github.com/settings/apps</a>
    </div>

    <form id="reencrypt-form">
        <div class="form-group">
            <label for="appId">GitHub App ID</label>
            <input type="text" id="appId" name="appId" required placeholder="123456">
        </div>

        <div class="form-group">
            <label for="privateKey">Private Key (PEM format)</label>
            <textarea id="privateKey" name="privateKey" required placeholder="-----BEGIN RSA PRIVATE KEY-----"></textarea>
        </div>

        <div class="form-group">
            <label for="webhookSecret">Webhook Secret</label>
            <input type="text" id="webhookSecret" name="webhookSecret" required placeholder="Your webhook secret">
        </div>

        <button type="submit" class="btn">Re-encrypt Credentials</button>
        <a href="/" class="btn btn-secondary">Cancel</a>
    </form>

    <div id="result" class="result"></div>

    <script>
        document.getElementById('reencrypt-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const resultDiv = document.getElementById('result');
            resultDiv.style.display = 'none';
            resultDiv.className = 'result';

            const formData = {
                appId: document.getElementById('appId').value,
                privateKey: document.getElementById('privateKey').value,
                webhookSecret: document.getElementById('webhookSecret').value
            };

            try {
                const response = await fetch('/gh-setup/re-encrypt', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });

                const data = await response.json();

                if (response.ok) {
                    resultDiv.classList.add('success');
                    resultDiv.textContent = 'Success! Credentials have been re-encrypted. You can now use interactive mode.';
                } else {
                    resultDiv.classList.add('error');
                    resultDiv.textContent = 'Error: ' + (data.error || 'Unknown error');
                }

                resultDiv.style.display = 'block';
            } catch (error) {
                resultDiv.classList.add('error');
                resultDiv.textContent = 'Error: ' + error.message;
                resultDiv.style.display = 'block';
            }
        });
    </script>
</body>
</html>`;
  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}

/**
 * Handle re-encrypt POST request
 */
export async function handleReEncrypt(request: Request, env: Env): Promise<Response> {
  try {
    if (!env.ENCRYPTION_KEY) {
      return Response.json({ error: 'ENCRYPTION_KEY not configured' }, { status: 500 });
    }

    let body: any;
    try {
      const rawBody = await request.text();
      if (!rawBody) {
        return Response.json({ error: 'Request body is empty' }, { status: 400 });
      }
      body = JSON.parse(rawBody);
    } catch (e) {
      return Response.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { appId, privateKey, webhookSecret } = body;

    if (!appId || !privateKey || !webhookSecret) {
      return Response.json({
        error: 'Missing required fields',
        received: { hasAppId: !!appId, hasPrivateKey: !!privateKey, hasWebhookSecret: !!webhookSecret }
      }, { status: 400 });
    }

    logWithContext('RE_ENCRYPT', 'Re-encrypting GitHub credentials', {
      appId,
      privateKeyLength: privateKey.length,
      webhookSecretLength: webhookSecret.length
    });

    // Encrypt the credentials with the current key
    const encryptedPrivateKey = await encrypt(privateKey, env.ENCRYPTION_KEY);
    const encryptedWebhookSecret = await encrypt(webhookSecret, env.ENCRYPTION_KEY);

    // Get existing config to preserve repositories and other settings
    const configId = (env.GITHUB_APP_CONFIG as any).idFromName('github-app-config');
    const configDO = (env.GITHUB_APP_CONFIG as any).get(configId);

    const getResponse = await configDO.fetch(new Request('http://internal/get'));
    const existingConfigText = await getResponse.text();

    logWithContext('RE_ENCRYPT', 'Existing config check', {
      hasExistingConfig: !!existingConfigText,
      configLength: existingConfigText?.length || 0
    });

    let updateData: any = {
      appId,
      privateKey: encryptedPrivateKey,
      webhookSecret: encryptedWebhookSecret,
      owner: {
        login: 'unknown',
        type: 'User',
        id: 0
      },
      permissions: {
        contents: 'write',
        metadata: 'read',
        pull_requests: 'write',
        issues: 'write'
      },
      events: ['issues'],
      repositories: [],
      createdAt: new Date().toISOString(),
      webhookCount: 0
    };

    // Preserve existing settings if available
    if (existingConfigText && existingConfigText.length > 0) {
      try {
        const existing = JSON.parse(existingConfigText);
        updateData.repositories = existing.repositories || [];
        updateData.installationId = existing.installationId;
        if (existing.owner) updateData.owner = existing.owner;
        if (existing.permissions) updateData.permissions = existing.permissions;
        if (existing.events) updateData.events = existing.events;
        if (existing.createdAt) updateData.createdAt = existing.createdAt;
        if (existing.lastWebhookAt) updateData.lastWebhookAt = existing.lastWebhookAt;
        updateData.webhookCount = existing.webhookCount || 0;

        logWithContext('RE_ENCRYPT', 'Preserving existing config', {
          repositoryCount: updateData.repositories.length,
          hasInstallationId: !!updateData.installationId
        });
      } catch (e) {
        logWithContext('RE_ENCRYPT', 'Could not parse existing config, creating new', {
          error: e instanceof Error ? e.message : String(e)
        });
      }
    }

    // Set the encryption key in the DO before storing
    await configDO.fetch(new Request('http://internal/set-encryption-key', {
      method: 'POST',
      body: JSON.stringify({ encryptionKey: env.ENCRYPTION_KEY })
    }));

    // Store the updated config
    const storeResponse = await configDO.fetch(new Request('http://internal/store', {
      method: 'POST',
      body: JSON.stringify(updateData)
    }));

    if (!storeResponse.ok) {
      const errorText = await storeResponse.text();
      logWithContext('RE_ENCRYPT', 'Failed to store re-encrypted config', { error: errorText });
      return Response.json({ error: 'Failed to store credentials' }, { status: 500 });
    }

    logWithContext('RE_ENCRYPT', 'Credentials re-encrypted successfully', { appId });

    return Response.json({ success: true, message: 'Credentials re-encrypted successfully' });

  } catch (error) {
    logWithContext('RE_ENCRYPT', 'Error re-encrypting credentials', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return Response.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Handle clear config request - removes existing GitHub App configuration
 */
export async function handleClearConfig(env: Env): Promise<Response> {
  try {
    logWithContext('CLEAR_CONFIG', 'Clearing GitHub App configuration');

    const configId = (env.GITHUB_APP_CONFIG as any).idFromName('github-app-config');
    const configDO = (env.GITHUB_APP_CONFIG as any).get(configId);

    // Delete the config by storing empty data
    const deleteResponse = await configDO.fetch(new Request('http://internal/delete', {
      method: 'POST'
    }));

    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      logWithContext('CLEAR_CONFIG', 'Failed to clear config', { error: errorText });
      return Response.json({ error: 'Failed to clear configuration' }, { status: 500 });
    }

    logWithContext('CLEAR_CONFIG', 'GitHub App configuration cleared successfully');

    return Response.json({ success: true, message: 'Configuration cleared' });

  } catch (error) {
    logWithContext('CLEAR_CONFIG', 'Error clearing config', {
      error: error instanceof Error ? error.message : String(error)
    });
    return Response.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}