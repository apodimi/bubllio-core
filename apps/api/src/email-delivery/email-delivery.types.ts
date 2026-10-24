export type EmailDeliveryPublicStatus = 'required' | 'awaiting_confirmation' | 'ready' | 'attention'

export type EmailDeliverySafeErrorCode =
  | 'EMAIL_DELIVERY_UNAVAILABLE'
  | 'EMAIL_DELIVERY_AUTHENTICATION_FAILED'
  | 'EMAIL_DELIVERY_TLS_FAILED'
  | 'EMAIL_DELIVERY_REJECTED'
  | 'EMAIL_CONFIRMATION_EXPIRED'
  | 'EMAIL_CONFIRMATION_INVALID'
  | 'IDENTITY_ACTIVATION_FAILED'

export interface EmailDeliveryStatusView {
  status: EmailDeliveryPublicStatus
  safeErrorCode?: EmailDeliverySafeErrorCode
  confirmationRetryable?: boolean
}

export interface EmailTestInput {
  senderName: string
  senderEmail: string
  replyToEmail?: string
  host: string
  port: number
  security: 'starttls' | 'tls' | 'none'
  authentication: boolean
  username?: string
  password?: string
  testRecipient: string
}

export interface EmailTestAgentInput extends EmailTestInput {
  confirmationCode: string
  fingerprint: string
}

export interface EmailConfirmInput {
  code: string
}
