import { readFile, stat } from 'node:fs/promises'

import { Inject, Injectable, type OnApplicationBootstrap } from '@nestjs/common'

import { RUNTIME_CONFIG, type RuntimeConfig } from '../config/runtime-config.js'
import { InstallationManifestRepository } from './installation-manifest.repository.js'
import {
  parseInstallationManifest,
  type InstallationManifest,
} from './installation-manifest.schema.js'

const MAX_MANIFEST_BYTES = 256 * 1024

export interface InstallationManifestStatus {
  schemaVersion: '1' | null
  configured: boolean
  applicationCount: number
  applications: readonly { key: string; contractVersion: string }[]
}

@Injectable()
export class InstallationManifestService implements OnApplicationBootstrap {
  private manifest?: InstallationManifest

  constructor(
    @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig,
    private readonly repository: InstallationManifestRepository,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const path = this.config.applicationManifestPath
    if (!path) return

    let metadata
    try {
      metadata = await stat(path)
    } catch {
      throw new Error('Application manifest could not be read')
    }
    if (!metadata.isFile() || metadata.size > MAX_MANIFEST_BYTES) {
      throw new Error('Application manifest must be a regular file no larger than 256 KiB')
    }
    let serialized: string
    try {
      serialized = await readFile(path, 'utf8')
    } catch {
      throw new Error('Application manifest could not be read')
    }
    let input: unknown
    try {
      input = JSON.parse(serialized)
    } catch {
      throw new Error('Application manifest must contain valid JSON')
    }
    this.manifest = parseInstallationManifest(input, this.config.environment)
    await this.repository.reconcile(this.manifest)
  }

  status(): InstallationManifestStatus {
    return {
      schemaVersion: this.manifest?.schemaVersion ?? null,
      configured: this.manifest !== undefined,
      applicationCount: this.manifest?.applications.length ?? 0,
      applications:
        this.manifest?.applications.map(({ key, contractVersion }) => ({
          key,
          contractVersion,
        })) ?? [],
    }
  }
}
