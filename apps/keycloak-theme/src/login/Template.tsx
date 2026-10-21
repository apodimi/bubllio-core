import { useEffect } from "react";
import { kcSanitize } from "keycloakify/lib/kcSanitize";
import type { TemplateProps } from "keycloakify/login/TemplateProps";
import logoUrl from "./assets/bubllio-mark.png";
import type { KcContext } from "./KcContext";
import type { I18n } from "./i18n";
import "./theme.css";

export default function Template(props: TemplateProps<KcContext, I18n>) {
  const {
    children,
    displayInfo = false,
    displayMessage = true,
    documentTitle,
    headerNode,
    infoNode,
    kcContext,
    i18n,
    socialProvidersNode,
  } = props;
  const { currentLanguage, enabledLanguages, msg, msgStr } = i18n;
  const { auth, isAppInitiatedAction, message, realm, url } = kcContext;

  useEffect(() => {
    document.documentElement.lang = currentLanguage.languageTag;
    document.title =
      documentTitle ?? msgStr("loginTitle", realm.displayName || realm.name);
  }, [
    currentLanguage.languageTag,
    documentTitle,
    msgStr,
    realm.displayName,
    realm.name,
  ]);

  return (
    <main className="identity-shell">
      <section className="brand-panel" aria-label="Bubllio Identity">
        <div className="brand-panel__topline">
          <a
            className="brand"
            href={url.loginRestartFlowUrl}
            aria-label="Bubllio Identity"
          >
            <img src={logoUrl} alt="" />
            <span>bubllio / identity</span>
          </a>
          {enabledLanguages.length > 1 && (
            <nav className="language-switcher" aria-label={msgStr("languages")}>
              {enabledLanguages.map((language) => (
                <a
                  key={language.languageTag}
                  href={language.href}
                  hrefLang={language.languageTag}
                  lang={language.languageTag}
                  aria-current={
                    language.languageTag === currentLanguage.languageTag
                      ? "page"
                      : undefined
                  }
                >
                  {language.languageTag === "el"
                    ? "ΕΛ"
                    : language.languageTag.toUpperCase()}
                </a>
              ))}
            </nav>
          )}
        </div>

        <div className="brand-story">
          <h2>{msg("bubllioHeroTitle")}</h2>
          <p>{msg("bubllioHeroDescription")}</p>
        </div>
        <small>{msg("bubllioTagline")}</small>
      </section>

      <section className="form-panel">
        <div className="auth-card">
          <header className="auth-card__header">
            {auth?.showUsername && !auth.showResetCredentials ? (
              <div className="attempted-username">
                <span>{auth.attemptedUsername}</span>
                <a href={url.loginRestartFlowUrl}>
                  {msg("restartLoginTooltip")}
                </a>
              </div>
            ) : (
              <>
                <h1 id="kc-page-title">{headerNode}</h1>
                {kcContext.pageId === "login.ftl" && (
                  <p>{msg("bubllioSignInDescription")}</p>
                )}
              </>
            )}
          </header>

          {displayMessage &&
            message &&
            (message.type !== "warning" || !isAppInitiatedAction) && (
              <div
                className={`auth-alert auth-alert--${message.type}`}
                role="alert"
              >
                <span
                  dangerouslySetInnerHTML={{
                    __html: kcSanitize(message.summary),
                  }}
                />
              </div>
            )}

          <div className="auth-content">{children}</div>
          {socialProvidersNode}
          {displayInfo && infoNode && (
            <div className="auth-info">{infoNode}</div>
          )}

          {auth?.showTryAnotherWayLink && (
            <form
              id="kc-select-try-another-way-form"
              action={url.loginAction}
              method="post"
            >
              <input type="hidden" name="tryAnotherWay" value="on" />
              <button className="link-button" type="submit">
                {msg("doTryAnotherWay")}
              </button>
            </form>
          )}

          <p className="access-help">{msg("bubllioAccessHelp")}</p>
        </div>
      </section>
    </main>
  );
}
