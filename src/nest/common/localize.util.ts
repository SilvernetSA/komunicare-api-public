import { IPinfoWrapper } from 'node-ipinfo';

const ipinfo = new IPinfoWrapper(process.env.IP_INFO_TOKEN as string);

interface IpLocation {
  ip: string;
  country: string;
  countryCode: string;
  region: string;
  city: string;
}

export function isLocalIp(ip: string): boolean {
  const localIp = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];
  return localIp.includes(ip);
}

export async function findIpLocation(ip: string): Promise<IpLocation> {
  return new Promise((resolve, reject) => {
    if (isLocalIp(ip)) {
      reject({ message: 'Local Ip supplied' });
      return;
    }

    ipinfo
      .lookupIp(ip)
      .then((res) => {
        if (!res.country) {
          reject({
            message: 'The location retrieved from Ip Info was incorrect',
          });
          return;
        }

        resolve({
          ip: res.ip,
          country: res.country,
          countryCode: res.countryCode,
          region: res.region,
          city: res.city,
        });
      })
      .catch((error) => {
        reject(error);
      });
  });
}
