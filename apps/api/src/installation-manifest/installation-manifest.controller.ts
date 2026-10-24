import { Controller, Get, Header } from '@nestjs/common'

import {
  InstallationManifestService,
  type InstallationManifestStatus,
} from './installation-manifest.service.js'

@Controller('api/v1/system/installation-manifest')
export class InstallationManifestController {
  constructor(private readonly manifest: InstallationManifestService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  getStatus(): InstallationManifestStatus {
    return this.manifest.status()
  }
}
