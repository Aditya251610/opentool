import { HttpClient } from '../http'
import type { UserProfile, UpdateProfileInput, User } from '../types'

export class UsersResource {
  constructor(private http: HttpClient) {}

  /** Get the authenticated user's profile. */
  async me(): Promise<UserProfile> {
    return this.http.get<UserProfile>('/api/users/me')
  }

  /** Update the authenticated user's profile. */
  async updateMe(input: UpdateProfileInput): Promise<User> {
    return this.http.patch<User>('/api/users/me', input)
  }
}
