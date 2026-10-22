declare module "mjml" {
  interface MjmlOptions {
    minify?: boolean;
    validationLevel?: "skip" | "soft" | "strict";
  }

  interface MjmlResult {
    html: string;
  }

  export default function mjml(
    markup: string,
    options?: MjmlOptions,
  ): Promise<MjmlResult>;
}
