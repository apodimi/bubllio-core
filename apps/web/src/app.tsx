import { useState } from "react";
import type Keycloak from "keycloak-js";

import bubllioMark from "./assets/bubllio-mark.png";
import { getCurrentIdentity, type CoreIdentity } from "./core-api";

interface AppProps {
  keycloak: Keycloak;
}

export function App({ keycloak }: AppProps) {
  const [identity, setIdentity] = useState<CoreIdentity>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const readIdentity = async () => {
    setLoading(true);
    setError(undefined);

    try {
      setIdentity(await getCurrentIdentity(keycloak));
    } catch (cause) {
      setIdentity(undefined);
      setError(cause instanceof Error ? cause.message : "The request failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-lockup" aria-label="Bubllio Core">
          <img src={bubllioMark} alt="" />
          <strong>bubllio</strong>
          <span>/ core</span>
        </div>
        <button
          className="secondary"
          onClick={() =>
            void keycloak.logout({ redirectUri: window.location.origin })
          }
        >
          Sign out
        </button>
      </header>

      <main>
        <h1>Identity foundation</h1>
        <p className="intro">
          One secure identity and organization context across every Bubllio
          workspace.
        </p>

        <section aria-labelledby="session-title">
          <div>
            <p className="label">Current session</p>
            <h2 id="session-title">Authenticated</h2>
            <p className="muted">{keycloak.tokenParsed?.preferred_username}</p>
          </div>

          <button disabled={loading} onClick={() => void readIdentity()}>
            {loading ? "Calling Core…" : "Verify with Core"}
          </button>
        </section>

        {identity ? (
          <section className="result" aria-live="polite">
            <p className="label">Verified by Core API</p>
            <dl>
              <div>
                <dt>Subject</dt>
                <dd>{identity.subject}</dd>
              </div>
              <div>
                <dt>Organization</dt>
                <dd>{Object.keys(identity.organization).join(", ")}</dd>
              </div>
              <div>
                <dt>Audience</dt>
                <dd>{identity.audience.join(", ")}</dd>
              </div>
            </dl>
          </section>
        ) : null}

        {error ? (
          <p className="error" role="alert">
            {error} If the token has no organization, add the demo user to one
            in Keycloak.
          </p>
        ) : null}
      </main>
    </div>
  );
}
