import { randomUUID } from 'node:crypto'

import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common'

const PROBLEM_BY_STATUS: Record<number, { code: string; title: string }> = {
  401: { code: 'UNAUTHENTICATED', title: 'Authentication required' },
  404: { code: 'SETUP_UNAVAILABLE', title: 'Setup unavailable' },
  409: { code: 'SETUP_CLAIM_CONFLICT', title: 'Setup conflict' },
  422: { code: 'SETUP_INVALID_REQUEST', title: 'Invalid setup request' },
}

/** Returns stable, non-sensitive setup errors without echoing credentials or request data. */
@Catch(HttpException)
export class SetupProblemFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const status = exception.getStatus()
    const problem = PROBLEM_BY_STATUS[status] ?? {
      code: 'SETUP_UNAVAILABLE',
      title: 'Setup unavailable',
    }
    const response = host.switchToHttp().getResponse<{
      header: (name: string, value: string) => void
      status: (code: number) => { send: (body: unknown) => void }
    }>()

    response.header('Cache-Control', 'no-store, max-age=0')
    response.header('Pragma', 'no-cache')
    response.header('Referrer-Policy', 'no-referrer')
    response.header('X-Content-Type-Options', 'nosniff')
    response.header('X-Frame-Options', 'DENY')
    response.header('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'")
    response.header('Content-Type', 'application/problem+json')
    response.status(status).send({
      code: problem.code,
      correlationId: randomUUID(),
      status,
      title: problem.title,
      type: 'about:blank',
    })
  }
}
