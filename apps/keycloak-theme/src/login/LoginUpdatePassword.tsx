import eyeIcon from "@iconify-icons/keyline-icons/eye";
import eyeOffIcon from "@iconify-icons/keyline-icons/eye-off";
import { useState } from "react";
import { kcSanitize } from "keycloakify/lib/kcSanitize";
import type { PageProps } from "keycloakify/login/pages/PageProps";

import { AppIcon } from "./AppIcon";
import type { KcContext } from "./KcContext";
import type { I18n } from "./i18n";

export default function LoginUpdatePassword(
  props: PageProps<
    Extract<KcContext, { pageId: "login-update-password.ftl" }>,
    I18n
  >,
) {
  const { kcContext, i18n, Template } = props;
  const { isAppInitiatedAction, messagesPerField, url } = kcContext;
  const { msg, msgStr } = i18n;
  const [newPasswordVisible, setNewPasswordVisible] = useState(false);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasPasswordError = messagesPerField.existsError(
    "password",
    "password-confirm",
  );

  return (
    <Template
      {...props}
      displayMessage={!hasPasswordError}
      headerNode={msg("updatePasswordTitle")}
    >
      <form
        id="kc-passwd-update-form"
        className="auth-form"
        action={url.loginAction}
        method="post"
        onSubmit={() => setIsSubmitting(true)}
      >
        <PasswordField
          id="password-new"
          name="password-new"
          label={msg("passwordNew")}
          autoFocus
          visible={newPasswordVisible}
          onToggle={() => setNewPasswordVisible((value) => !value)}
          invalid={hasPasswordError}
          error={
            messagesPerField.existsError("password")
              ? messagesPerField.get("password")
              : undefined
          }
          showLabel={msgStr("showPassword")}
          hideLabel={msgStr("hidePassword")}
        />

        <PasswordField
          id="password-confirm"
          name="password-confirm"
          label={msg("passwordConfirm")}
          visible={confirmationVisible}
          onToggle={() => setConfirmationVisible((value) => !value)}
          invalid={hasPasswordError}
          error={
            messagesPerField.existsError("password-confirm")
              ? messagesPerField.get("password-confirm")
              : undefined
          }
          showLabel={msgStr("showPassword")}
          hideLabel={msgStr("hidePassword")}
        />

        <div id="kc-form-options" className="form-options">
          <label className="remember-me">
            <input
              type="checkbox"
              id="logout-sessions"
              name="logout-sessions"
              value="on"
            />
            <span>{msg("logoutOtherSessions")}</span>
          </label>
        </div>

        <div className="form-buttons">
          <button
            className="primary-button"
            type="submit"
            disabled={isSubmitting}
          >
            {msg("doSubmit")}
          </button>
          {isAppInitiatedAction && (
            <button
              className="secondary-button"
              type="submit"
              name="cancel-aia"
              value="true"
              disabled={isSubmitting}
            >
              {msg("doCancel")}
            </button>
          )}
        </div>
      </form>
    </Template>
  );
}

function PasswordField(props: {
  id: "password-new" | "password-confirm";
  name: "password-new" | "password-confirm";
  label: React.ReactNode;
  visible: boolean;
  onToggle: () => void;
  invalid: boolean;
  error?: string;
  showLabel: string;
  hideLabel: string;
  autoFocus?: boolean;
}) {
  const errorId = `${props.id}-error`;
  const toggleLabel = props.visible ? props.hideLabel : props.showLabel;

  return (
    <div className="field-group">
      <label htmlFor={props.id}>{props.label}</label>
      <div className="password-field">
        <input
          id={props.id}
          name={props.name}
          type={props.visible ? "text" : "password"}
          autoComplete="new-password"
          autoFocus={props.autoFocus}
          aria-invalid={props.invalid}
          aria-describedby={props.error ? errorId : undefined}
        />
        <button
          type="button"
          onClick={props.onToggle}
          aria-label={toggleLabel}
          aria-controls={props.id}
          aria-pressed={props.visible}
        >
          <AppIcon icon={props.visible ? eyeOffIcon : eyeIcon} size={19} />
        </button>
      </div>
      {props.error && (
        <p
          id={errorId}
          className="field-error"
          role="alert"
          dangerouslySetInnerHTML={{ __html: kcSanitize(props.error) }}
        />
      )}
    </div>
  );
}
