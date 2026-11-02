import { requestMiddleware, responseMiddleware } from '../middleware'

export async function apiFetch(input, options = {}) {
  let request = { input, options }
  for (const middleware of requestMiddleware) {
    request = (await middleware(request)) || request
  }

  const response = await fetch(request.input, request.options)
  for (const middleware of responseMiddleware) {
    await middleware(response, request)
  }
  return response
}
