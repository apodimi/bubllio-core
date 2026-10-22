import mjml from "mjml";

export interface EmailContent {
  actionLabel?: string;
  actionUrl?: string;
  body: readonly string[];
  expiration?: string;
  expirationLabel?: string;
  footer: string;
  heading: string;
  locale: string;
  oneTimeLabel?: string;
  preheader: string;
  purpose: string;
  securityLabel?: string;
  securityNote?: string;
}

export async function renderEmail(content: EmailContent): Promise<string> {
  const paragraphs = content.body
    .map(
      (paragraph) => `
        <mj-text css-class="body-copy">
          ${paragraph}
        </mj-text>`,
    )
    .join("");
  const action =
    content.actionLabel && content.actionUrl
      ? `
        <mj-button href="${content.actionUrl}" align="left">
          ${content.actionLabel}
        </mj-button>`
      : "";
  const securityReceipt =
    content.securityNote &&
    content.securityLabel &&
    content.expiration &&
    content.expirationLabel &&
    content.oneTimeLabel
      ? `
      <mj-section background-color="#eaf2ff" padding="0">
        <mj-column width="62%" padding="24px 28px">
          <mj-text color="#526075" font-size="11px" font-weight="700" line-height="15px" padding="0 0 6px">
            ${content.expirationLabel}
          </mj-text>
          <mj-text color="#0f1f38" font-size="17px" font-weight="700" line-height="22px" padding="0">
            ${content.expiration}
          </mj-text>
        </mj-column>
        <mj-column width="38%" background-color="#dce9ff" padding="24px 28px">
          <mj-text color="#526075" font-size="11px" font-weight="700" line-height="15px" padding="0 0 6px">
            ${content.securityLabel}
          </mj-text>
          <mj-text color="#0f1f38" font-size="17px" font-weight="700" line-height="22px" padding="0">
            ${content.oneTimeLabel}
          </mj-text>
        </mj-column>
      </mj-section>
      <mj-section background-color="#ffffff" padding="24px 44px 34px">
        <mj-column>
          <mj-text color="#526075" font-size="13px" line-height="21px" padding="0">
            ${content.securityNote}
          </mj-text>
        </mj-column>
      </mj-section>`
      : content.securityNote
        ? `
      <mj-section background-color="#ffffff" padding="10px 44px 34px">
        <mj-column>
          <mj-text color="#526075" font-size="13px" line-height="21px" padding="0">
            ${content.securityNote}
          </mj-text>
        </mj-column>
      </mj-section>`
        : "";

  const { html } = await mjml(
    `
      <mjml lang="${content.locale}">
        <mj-head>
          <mj-title>${content.heading}</mj-title>
          <mj-preview>${content.preheader}</mj-preview>
          <mj-attributes>
            <mj-all font-family="Inter, Arial, sans-serif" />
            <mj-text color="#526075" font-size="16px" line-height="26px" padding="0 0 18px" />
            <mj-button background-color="#0f1f38" border-radius="5px" color="#ffffff" font-size="16px" font-weight="700" inner-padding="15px 24px" padding="10px 0 36px" />
          </mj-attributes>
        </mj-head>
        <mj-body background-color="#edf3fc" width="640px">
          <mj-section background-color="#005bef" padding="38px 44px 34px">
            <mj-column width="72%">
              <mj-text color="#ffffff" font-size="30px" font-weight="800" letter-spacing="-1px" line-height="38px" padding="0">
                bubllio <span style="color:#cfe0ff;font-size:17px;font-weight:600;letter-spacing:-0.3px">/ identity</span>
              </mj-text>
            </mj-column>
            <mj-column width="28%" vertical-align="middle">
              <mj-text align="right" color="#ffffff" font-size="12px" font-weight="700" line-height="18px" padding="8px 0 0">${content.purpose}</mj-text>
            </mj-column>
          </mj-section>
          <mj-section background-color="#ffffff" padding="46px 44px 14px">
            <mj-column width="100%">
              <mj-text color="#0f1f38" font-size="38px" font-weight="750" letter-spacing="-1.1px" line-height="45px" padding="0 0 24px">${content.heading}</mj-text>
              ${paragraphs}
              ${action}
            </mj-column>
          </mj-section>
          ${securityReceipt}
          <mj-section background-color="#edf3fc" padding="26px 44px 34px">
            <mj-column>
              <mj-text color="#6d7788" font-size="12px" line-height="19px" padding="0">
                ${content.footer}
              </mj-text>
            </mj-column>
          </mj-section>
        </mj-body>
      </mjml>`,
    { minify: false, validationLevel: "strict" },
  );

  return html;
}

export function renderPlainText(content: EmailContent): string {
  return [
    `Bubllio Identity — ${content.heading}`,
    "",
    ...content.body,
    ...(content.actionLabel && content.actionUrl
      ? ["", `${content.actionLabel}: ${content.actionUrl}`]
      : []),
    ...(content.expiration && content.expirationLabel
      ? ["", `${content.expirationLabel}: ${content.expiration}`]
      : []),
    ...(content.oneTimeLabel ? [content.oneTimeLabel] : []),
    ...(content.securityNote ? ["", content.securityNote] : []),
    "",
    content.footer,
  ].join("\n");
}
