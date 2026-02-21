import * as vscode from "vscode";
import * as http from "node:http";
import type { AuthSession, SupabaseClient, User } from "@supabase/supabase-js";

type ApiClient = SupabaseClient;
type OAuthProvider = "github" | "google";

export interface PasswordAuthInput {
  email: string;
  password: string;
}

export class CopilotColabAuthApi {
  constructor(private readonly client: ApiClient) {}

  private isMissingSessionError(error: { message: string } | null): boolean {
    if (!error) {
      return false;
    }
    return /auth session missing/i.test(error.message);
  }

  async getSession(): Promise<AuthSession | null> {
    const { data, error } = await this.client.auth.getSession();
    if (error) {
      throw new Error(error.message);
    }
    return data.session;
  }

  async getCurrentUser(): Promise<User | null> {
    const { data, error } = await this.client.auth.getUser();
    if (error) {
      if (this.isMissingSessionError(error)) {
        return null;
      }
      throw new Error(error.message);
    }
    return data.user;
  }

  async signInWithPassword(input: PasswordAuthInput): Promise<AuthSession | null> {
    const { data, error } = await this.client.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });
    if (error) {
      throw new Error(error.message);
    }
    return data.session;
  }

  async signUpWithPassword(input: PasswordAuthInput): Promise<AuthSession | null> {
    const { data, error } = await this.client.auth.signUp({
      email: input.email,
      password: input.password,
    });
    if (error) {
      throw new Error(error.message);
    }
    return data.session ?? null;
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  }

  /**
   * Start an OAuth flow for the given provider.
   *
   * Spins up a temporary local HTTP server that serves a bridge page.
   * Supabase redirects to `http://localhost:<port>/auth/callback#access_token=...`.
   * The bridge page reads the fragment client-side and POSTs the tokens back,
   * allowing the extension to call `setSession()` and complete the flow.
   */
  async signInWithOAuth(
    provider: OAuthProvider,
    _extensionId: string,
  ): Promise<AuthSession | null> {
    return new Promise<AuthSession | null>((resolve, reject) => {
      // 1. Create a one-shot HTTP server on a random port
      const server = http.createServer((req, res) => {
        const url = new URL(req.url ?? "/", `http://localhost`);

        if (req.method === "GET" && url.pathname === "/auth/callback") {
          // Serve bridge HTML — reads fragment and POSTs tokens back
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(BRIDGE_HTML);
          return;
        }

        if (req.method === "POST" && url.pathname === "/auth/tokens") {
          // Receive tokens from the bridge page
          let body = "";
          req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
          req.on("end", async () => {
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(SUCCESS_HTML);
            cleanup();

            try {
              const params = new URLSearchParams(body);
              const accessToken = params.get("access_token");
              const refreshToken = params.get("refresh_token");

              if (!accessToken || !refreshToken) {
                throw new Error("OAuth callback missing tokens. Please try again.");
              }

              const { data: sessionData, error: sessionError } =
                await this.client.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                });

              if (sessionError) {
                throw new Error(sessionError.message);
              }

              resolve(sessionData.session);
            } catch (err) {
              reject(err);
            }
          });
          return;
        }

        res.writeHead(404);
        res.end("Not found");
      });

      // 2. Timeout after 2 minutes
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("OAuth sign-in timed out after 120 seconds."));
      }, 120_000);

      const cleanup = () => {
        clearTimeout(timeout);
        try { server.close(); } catch { /* ignore */ }
      };

      // 3. Start listening on a random available port
      server.listen(0, "127.0.0.1", async () => {
        const addr = server.address();
        if (!addr || typeof addr === "string") {
          cleanup();
          reject(new Error("Failed to start OAuth callback server."));
          return;
        }

        const port = addr.port;
        const redirectUrl = `http://localhost:${port}/auth/callback`;

        try {
          const { data, error } = await this.client.auth.signInWithOAuth({
            provider,
            options: {
              redirectTo: redirectUrl,
              skipBrowserRedirect: true,
            },
          });

          if (error) {
            cleanup();
            throw new Error(error.message);
          }

          if (!data.url) {
            cleanup();
            throw new Error(`OAuth provider ${provider} did not return an auth URL.`);
          }

          // Open the OAuth consent page in the user's real browser
          await vscode.env.openExternal(vscode.Uri.parse(data.url));
        } catch (err) {
          cleanup();
          reject(err);
        }
      });

      server.on("error", (err) => {
        cleanup();
        reject(new Error(`OAuth callback server error: ${err.message}`));
      });
    });
  }
}

// ── Bridge HTML ──────────────────────────────────────────────────────────────
// Served at /auth/callback — reads fragment tokens and POSTs them back.
const BRIDGE_HTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Signing in…</title>
<style>
  body { font-family: system-ui, sans-serif; background: #111113; color: #e4e4e7;
         display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
  .card { text-align: center; }
  .spinner { width: 24px; height: 24px; border: 3px solid #333; border-top-color: #6366f1;
             border-radius: 50%; animation: spin .6s linear infinite; margin: 0 auto 16px; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style></head>
<body><div class="card">
  <div class="spinner"></div>
  <p>Completing sign-in…</p>
</div>
<script>
  const hash = window.location.hash.substring(1);
  if (hash) {
    fetch('/auth/tokens', { method: 'POST', body: hash,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }).then(() => {
      document.querySelector('p').textContent = 'Signed in! You can close this tab.';
    }).catch(() => {
      document.querySelector('p').textContent = 'Something went wrong. Please try again.';
    });
  } else {
    document.querySelector('p').textContent = 'No tokens received. Please try again.';
  }
</script></body></html>`;

const SUCCESS_HTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Signed in</title>
<style>
  body { font-family: system-ui, sans-serif; background: #111113; color: #e4e4e7;
         display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
</style></head>
<body><p>✓ Signed in successfully. You can close this tab.</p></body></html>`;
