import { Inject, Injectable } from '@nestjs/common'
import type { JWTVerifyGetKey } from 'jose'

import { RUNTIME_CONFIG, type RuntimeConfig } from '../config/runtime-config.js'
import type { VerifiedSubject } from './identity.types.js'
import { createOidcKeyResolver, verifyAccessToken } from './oidc/oidc-token.verifier.js'
import type { OidcConfig } from './oidc/oidc.types.js'

/** Owns OIDC configuration and the cached signing-key resolver. */
@Injectable()
export class AuthService {
  private readonly config: OidcConfig
  private readonly getKey: JWTVerifyGetKey

  constructor(@Inject(RUNTIME_CONFIG) runtimeConfig: RuntimeConfig) {
    this.config = runtimeConfig.oidc
    this.getKey = createOidcKeyResolver(this.config)
  }

  verify(token: string): Promise<VerifiedSubject> {
    return verifyAccessToken(token, this.config, this.getKey)
  }
}
