import type { AuthSession, SupabaseClient, User } from "@supabase/supabase-js";

type ApiClient = SupabaseClient;

export interface PasswordAuthInput {
  email: string;
  password: string;
}

export class CopilotColabAuthApi {
  constructor(private readonly client: ApiClient) {}

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
}
