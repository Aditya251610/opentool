import { describe, it, expect } from 'vitest'
import {
  AuthRequiredError,
  ToolNotFoundError,
  ProviderNotFoundError,
  TokenExpiredError,
  ValidationError,
  mapErrorToResponse,
} from '../errors'

describe('Error classes', () => {
  it('AuthRequiredError carries provider, authUrl, and authType', () => {
    const err = new AuthRequiredError('github', 'https://github.com/oauth')
    expect(err.provider).toBe('github')
    expect(err.authUrl).toBe('https://github.com/oauth')
    expect(err.authType).toBe('oauth2')
    expect(err.name).toBe('AuthRequiredError')
  })

  it('AuthRequiredError can have custom authType', () => {
    const err = new AuthRequiredError('stripe', 'https://stripe.com/api', 'api_key')
    expect(err.authType).toBe('api_key')
  })

  it('ToolNotFoundError carries toolId', () => {
    const err = new ToolNotFoundError('github_create_issue')
    expect(err.toolId).toBe('github_create_issue')
    expect(err.name).toBe('ToolNotFoundError')
  })

  it('ProviderNotFoundError carries provider', () => {
    const err = new ProviderNotFoundError('unknown')
    expect(err.provider).toBe('unknown')
    expect(err.name).toBe('ProviderNotFoundError')
  })

  it('TokenExpiredError carries provider', () => {
    const err = new TokenExpiredError('github')
    expect(err.provider).toBe('github')
    expect(err.name).toBe('TokenExpiredError')
  })

  it('ValidationError carries field name', () => {
    const err = new ValidationError('email', 'Invalid email format')
    expect(err.field).toBe('email')
    expect(err.message).toBe('Invalid email format')
    expect(err.name).toBe('ValidationError')
  })
})

describe('mapErrorToResponse', () => {
  it('maps ValidationError to 400', () => {
    const { status, body } = mapErrorToResponse(new ValidationError('input', 'bad input'))
    expect(status).toBe(400)
    expect(body.error).toContain('bad input')
  })

  it('maps AuthRequiredError to 401 with authUrl', () => {
    const { status, body } = mapErrorToResponse(
      new AuthRequiredError('github', 'https://github.com/login'),
    )
    expect(status).toBe(401)
    expect(body.authUrl).toBe('https://github.com/login')
  })

  it('maps ToolNotFoundError to 404', () => {
    const { status, body } = mapErrorToResponse(new ToolNotFoundError('x'))
    expect(status).toBe(404)
    expect(body.error).toContain('Tool not found')
  })

  it('maps ProviderNotFoundError to 404', () => {
    const { status, body } = mapErrorToResponse(new ProviderNotFoundError('unknown'))
    expect(status).toBe(404)
    expect(body.error).toContain('Unknown provider')
  })

  it('maps TokenExpiredError to 401', () => {
    const { status, body } = mapErrorToResponse(new TokenExpiredError('github'))
    expect(status).toBe(401)
    expect(body.error).toContain('Token expired')
  })

  it('maps generic Error to 500', () => {
    const { status, body } = mapErrorToResponse(new Error('oops'))
    expect(status).toBe(500)
    expect(body.error).toBe('oops')
  })

  it('maps non-Error objects to 500', () => {
    const { status, body } = mapErrorToResponse('something went wrong')
    expect(status).toBe(500)
    expect(body.error).toBe('Internal server error')
  })
})
