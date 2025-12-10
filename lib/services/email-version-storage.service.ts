import type { SupabaseClient } from '@supabase/supabase-js'
import type { EmailVersion } from '../types'

/**
 * Generate a simple change summary comparing two versions
 */
function generateChangesSummary(
  oldEmail: { subject: string; content: string } | null,
  newEmail: { subject: string; content: string },
): string {
  if (!oldEmail) {
    return 'Initial version'
  }

  const changes: string[] = []

  if (oldEmail.subject !== newEmail.subject) {
    changes.push('subject')
  }

  const oldLines = oldEmail.content.split('\n')
  const newLines = newEmail.content.split('\n')

  // Count actual line differences
  let diffCount = 0
  const maxLen = Math.max(oldLines.length, newLines.length)
  for (let i = 0; i < maxLen; i++) {
    if (oldLines[i] !== newLines[i]) {
      diffCount++
    }
  }

  if (diffCount > 0) {
    changes.push(`${diffCount} line${diffCount > 1 ? 's' : ''}`)
  }

  if (changes.length === 0) {
    return 'No changes'
  }

  return changes.join(' and ') + ' changed'
}

export class EmailVersionStorageService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Save a new version of an email
   */
  async saveVersion(
    emailUuid: string,
    emailDay: number,
    email: { subject: string; content: string },
  ): Promise<EmailVersion> {
    // Get previous versions to check for duplicates and generate summary
    const versions = await this.getVersions(emailUuid)
    const previousVersion = versions.length > 0 ? versions[versions.length - 1] : null

    // Check if this version is identical to the previous one
    if (
      previousVersion &&
      previousVersion.subject === email.subject &&
      previousVersion.content === email.content
    ) {
      console.log('Skipping duplicate version save - content unchanged')
      return previousVersion
    }

    const changesSummary = generateChangesSummary(previousVersion, email)

    const { data, error } = await this.supabase
      .from('email_versions')
      .insert({
        email_id: emailUuid,
        subject: email.subject,
        content: email.content,
        changes_summary: changesSummary,
      })
      .select()
      .single()

    if (error) throw error

    // Return in the format expected by the app
    return {
      id: data.id,
      emailId: emailDay, // Use day for backwards compatibility
      subject: data.subject,
      content: data.content,
      timestamp: new Date(data.created_at).getTime(),
      changesSummary: data.changes_summary || '',
    }
  }

  /**
   * Get all versions for a specific email
   */
  async getVersions(emailUuid: string): Promise<EmailVersion[]> {
    const { data, error } = await this.supabase
      .from('email_versions')
      .select('*, emails!inner(day)')
      .eq('email_id', emailUuid)
      .order('created_at', { ascending: true })

    if (error) throw error

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((version: any) => ({
      id: version.id,
      emailId: version.emails.day, // Use day for backwards compatibility
      subject: version.subject,
      content: version.content,
      timestamp: new Date(version.created_at).getTime(),
      changesSummary: version.changes_summary || '',
    }))
  }

  /**
   * Get a specific version
   */
  async getVersion(versionId: string): Promise<EmailVersion | null> {
    const { data, error } = await this.supabase
      .from('email_versions')
      .select('*, emails!inner(day)')
      .eq('id', versionId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return {
      id: data.id,
      emailId: data.emails.day,
      subject: data.subject,
      content: data.content,
      timestamp: new Date(data.created_at).getTime(),
      changesSummary: data.changes_summary || '',
    }
  }

  /**
   * Delete a specific version
   */
  async deleteVersion(versionId: string): Promise<void> {
    const { error } = await this.supabase.from('email_versions').delete().eq('id', versionId)

    if (error) throw error
  }

  /**
   * Get version count for an email
   */
  async getVersionCount(emailUuid: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('email_versions')
      .select('*', { count: 'exact', head: true })
      .eq('email_id', emailUuid)

    if (error) throw error
    return count || 0
  }

  /**
   * Clear all versions for an email
   */
  async clearVersions(emailUuid: string): Promise<void> {
    const { error } = await this.supabase.from('email_versions').delete().eq('email_id', emailUuid)

    if (error) throw error
  }
}
