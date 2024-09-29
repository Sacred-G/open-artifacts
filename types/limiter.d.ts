declare module 'limiter' {
    export class RateLimiter {
      constructor(options?: any);
  
      removeTokens(tokens: number): void;
  
      // Add other methods as needed
    }
  }