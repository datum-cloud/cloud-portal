export const authAPI = () => {
  return {
    async getOAuthUser<T>(url: string, accessToken: string): Promise<T> {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch user profile: ${response.statusText}`)
      }

      const profile = await response.json()
      if (!profile) {
        throw new Error('Failed to parse profile data')
      }

      return profile
    },
  }
}
