import { lazy, Suspense } from "react";
import type { ClassKey } from "keycloakify/login";
import DefaultPage from "keycloakify/login/DefaultPage";
import type { KcContext } from "./KcContext";
import Login from "./Login";
import Template from "./Template";
import { useI18n } from "./i18n";

const UserProfileFormFields = lazy(
  () => import("keycloakify/login/UserProfileFormFields"),
);

export default function KcPage(props: { kcContext: KcContext }) {
  const { i18n } = useI18n({ kcContext: props.kcContext });
  const pageProps = {
    kcContext: props.kcContext,
    i18n,
    classes,
    Template,
    doUseDefaultCss: false,
  };

  return (
    <Suspense>
      {props.kcContext.pageId === "login.ftl" ? (
        <Login {...pageProps} kcContext={props.kcContext} />
      ) : (
        <DefaultPage
          {...pageProps}
          UserProfileFormFields={UserProfileFormFields}
          doMakeUserConfirmPassword
        />
      )}
    </Suspense>
  );
}

// Default Keycloakify pages reuse the same small Bubllio form primitives.
const classes = {
  kcFormClass: "auth-form",
  kcFormGroupClass: "field-group",
  kcLabelClass: "field-label",
  kcInputClass: "text-input",
  kcTextareaClass: "text-input",
  kcInputGroup: "password-field",
  kcInputErrorMessageClass: "field-error",
  kcFormSettingClass: "form-options",
  kcFormOptionsWrapperClass: "form-option-links",
  kcFormButtonsClass: "form-buttons",
  kcFormButtonsWrapperClass: "form-buttons",
  kcButtonClass: "button",
  kcButtonPrimaryClass: "primary-button",
  kcButtonSecondaryClass: "secondary-button",
  kcButtonBlockClass: "button--block",
  kcCheckClass: "remember-me",
  kcAlertClass: "auth-alert",
  kcAlertTitleClass: "auth-alert__title",
  kcSignUpClass: "auth-info",
} satisfies Partial<Record<ClassKey, string>>;
