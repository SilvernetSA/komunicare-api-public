import { Injectable } from '@nestjs/common';

import { findIpLocation } from '../../common/localize.util';
import { LocationModel } from './models/location.model';

@Injectable()
export class LocationRepository {
  async findByIp(ip: string): Promise<LocationModel> {
    const location = await findIpLocation(ip);
    const { ip: _ip, ...payload } = location;
    return payload as LocationModel;
  }
}
