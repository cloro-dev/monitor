declare module "favicon-fetch" {
  function faviconFetch(options?: {
    hostname?: string;
    uri?: string;
    size?: string | number;
    apikey?: string;
    fallbackText?: string;
    fallbackBg?: string;
  }): string;

  export = faviconFetch;
}
