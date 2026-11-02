import { authToken } from './authToken'
import { unauthorized } from './unauthorized'

export const requestMiddleware = [authToken]
export const responseMiddleware = [unauthorized]
