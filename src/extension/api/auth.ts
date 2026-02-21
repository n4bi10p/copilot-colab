import * as vscode from "vscode";
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
   * Opens the browser and returns a Promise that resolves once the
   * callback URI is handled and the session is established.
   */
  async signInWithOAuth(
    provider: OAuthProvider,
    extensionId: string,
  ): Promise<AuthSession | null> {
    // Build the redirect URL that VS Code can handle
    const callbackUri = await vscode.env.asExternalUri(
      vscode.Uri.parse(`${vscode.env.uriScheme}://${extensionId}/auth/callback`)
    );

    const { data, error } = await this.client.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: callbackUri.toString(),
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.url) {
      throw new Error(`OAuth provider ${provider} did not return an auth URL.`);
    }

    // Open the OAuth consent page in the user's real browser
    await vscode.env.openExternal(vscode.Uri.parse(data.url));

    // Wait for the URI callback from the browser redirect
    return new Promise<AuthSession | null>((resolve, reject) => {
      const timeout = setTimeout(() => {
        disposable.dispose();
        reject(new Error("OAuth sign-in timed out after 120 seconds."));
      }, 120_000);

      const disposable = vscode.window.registerUriHandler({
        handleUri: async (uri: vscode.Uri) => {
          clearTimeout(timeout);
          disposable.dispose();
          try {
            // Extract tokens from the fragment (#access_token=...&refresh_token=...)
            const fragment = uri.fragment || uri.query;
            const params = new URLSearchParams(fragment);
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
        },
      });
    });
  }
}
