import eyeIcon from "@iconify-icons/keyline-icons/eye";
import eyeOffIcon from "@iconify-icons/keyline-icons/eye-off";
import { useState } from "react";
import { kcSanitize } from "keycloakify/lib/kcSanitize";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import { AppIcon } from "./AppIcon";
import type { KcContext } from "./KcContext";
import type { I18n } from "./i18n";

export default function Login(
  props: PageProps<Extract<KcContext, { pageId: "login.ftl" }>, I18n>,
) {
  const { kcContext, i18n, Template } = props;
  const { auth, login, messagesPerField, realm, social, url, usernameHidden } =
    kcContext;
  const { msg, msgStr } = i18n;
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasCredentialError = messagesPerField.existsError(
    "username",
    "password",
  );

  return (
    <Template
      {...props}
      displayMessage={!hasCredentialError}
      headerNode={msg("loginAccountTitle")}
      displayInfo={realm.password && realm.registrationAllowed}
      infoNode={
        <span>
          {msg("noAccount")}{" "}
          <a href={url.registrationUrl}>{msg("doRegister")}</a>
        </span>
      }
      socialProvidersNode={
        realm.password && social?.providers?.length ? (
          <div className="social-providers">
            <span>{msg("identity-provider-login-label")}</span>
            {social.providers.map((provider) => (
              <a key={provider.alias} href={provider.loginUrl}>
                {provider.displayName}
              </a>
            ))}
          </div>
        ) : null
      }
    >
      {realm.password && (
        <form
          id="kc-form-login"
          action={url.loginAction}
          method="post"
          onSubmit={() => setIsSubmitting(true)}
        >
          {!usernameHidden && (
            <div className="field-group">
              <label htmlFor="username">
                {!realm.loginWithEmailAllowed
                  ? msg("username")
                  : realm.registrationEmailAsUsername
                    ? msg("email")
                    : msg("usernameOrEmail")}
              </label>
              <input
                id="username"
                name="username"
                type="text"
                defaultValue={login.username ?? ""}
                autoComplete="username"
                autoFocus
                aria-invalid={hasCredentialError}
              />
            </div>
          )}

          <div className="field-group">
            <label htmlFor="password">{msg("password")}</label>
            <div className="password-field">
              <input
                id="password"
                name="password"
                type={isPasswordVisible ? "text" : "password"}
                autoComplete="current-password"
                aria-invalid={hasCredentialError}
              />
              <button
                type="button"
                onClick={() => setIsPasswordVisible((value) => !value)}
                aria-label={msgStr(
                  isPasswordVisible ? "hidePassword" : "showPassword",
                )}
                aria-controls="password"
              >
                <AppIcon
                  icon={isPasswordVisible ? eyeOffIcon : eyeIcon}
                  size={19}
                />
              </button>
            </div>
          </div>

          {hasCredentialError && (
            <p
              className="field-error"
              role="alert"
              dangerouslySetInnerHTML={{
                __html: kcSanitize(
                  messagesPerField.getFirstError("username", "password"),
                ),
              }}
            />
          )}

          <div className="form-options">
            {realm.rememberMe && !usernameHidden ? (
              <label className="remember-me">
                <input
                  id="rememberMe"
                  name="rememberMe"
                  type="checkbox"
                  defaultChecked={Boolean(login.rememberMe)}
                />
                <span>{msg("rememberMe")}</span>
              </label>
            ) : (
              <span />
            )}
            {realm.resetPasswordAllowed && (
              <a href={url.loginResetCredentialsUrl}>
                {msg("doForgotPassword")}
              </a>
            )}
          </div>

          <input
            type="hidden"
            name="credentialId"
            value={auth.selectedCredential}
          />
          <button
            className="primary-button"
            name="login"
            type="submit"
            disabled={isSubmitting}
          >
            {msg("doLogIn")}
          </button>
        </form>
      )}
    </Template>
  );
}
