import { SetMetadata } from '@nestjs/common'

export const IS_PUBLIC_KEY = 'isPublic'

/** Explicitly opts a route out of the secure-by-default global guard. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)
