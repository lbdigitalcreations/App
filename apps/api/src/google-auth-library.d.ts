declare module 'google-auth-library' {
  export class OAuth2Client {
    constructor(clientId?: string);
    verifyIdToken(options: { idToken: string; audience?: string }): Promise<{
      getPayload(): {
        sub: string;
        email?: string;
        name?: string;
        picture?: string;
        [key: string]: any;
      } | undefined;
    }>;
  }
}
