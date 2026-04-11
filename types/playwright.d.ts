declare module "playwright" {
  export type Browser = {
    close(): Promise<void>;
    newContext(options?: Record<string, unknown>): Promise<BrowserContext>;
  };

  export type BrowserContext = {
    newPage(): Promise<Page>;
    close(): Promise<void>;
  };

  export type Locator = {
    innerText(): Promise<string>;
  };

  export type Page = {
    goto(url: string, options?: Record<string, unknown>): Promise<unknown>;
    url(): string;
    close(): Promise<void>;
    content(): Promise<string>;
    locator(selector: string): Locator;
    $$eval<T>(selector: string, pageFunction: (...args: any[]) => T): Promise<T>;
  };

  export const chromium: {
    launch(options?: Record<string, unknown>): Promise<Browser>;
  };
}
