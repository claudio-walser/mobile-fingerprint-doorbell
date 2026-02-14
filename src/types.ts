export interface SensorConfig {
  id: string;
  name: string;
  ipAddress: string;
  apiKey: string;
}

export interface Fingerprint {
  id: number;
  name: string;
}

export interface SensorStatus {
  connected: boolean;
  enrolling: boolean;
  count: number;
}

export interface EnrollResponse {
  status: string;
  id: number;
  name: string;
}
