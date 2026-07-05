import { Injectable } from '@nestjs/common';

import { LocationModel } from './models/location.model';
import { LocationRepository } from './location.repository';

@Injectable()
export class LocationService {
  constructor(private readonly locationRepository: LocationRepository) {}

  async getLocation(ip: string): Promise<LocationModel> {
    try {
      return await this.locationRepository.findByIp(ip);
    } catch {
      // Preserve endpoint stability for local/private IPs where geolocation is unavailable.
      return {
        country: '',
        countryCode: '',
        region: '',
        city: '',
      };
    }
  }
}
