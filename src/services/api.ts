import { SensorConfig, Fingerprint, SensorStatus, EnrollResponse } from '../types';

function buildHeaders(sensor: SensorConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (sensor.apiKey) {
    headers['Authorization'] = `Bearer ${sensor.apiKey}`;
  }
  return headers;
}

function baseUrl(sensor: SensorConfig): string {
  const ip = sensor.ipAddress.replace(/\/+$/, '');
  const protocol = ip.startsWith('http') ? '' : 'http://';
  return `${protocol}${ip}/fingerprint`;
}

export async function listFingerprints(sensor: SensorConfig): Promise<Fingerprint[]> {
  const response = await fetch(`${baseUrl(sensor)}/list`, {
    headers: buildHeaders(sensor),
  });
  if (!response.ok) {
    throw new Error(`Failed to list fingerprints: ${response.status}`);
  }
  return response.json();
}

export async function getStatus(sensor: SensorConfig): Promise<SensorStatus> {
  const response = await fetch(`${baseUrl(sensor)}/status`, {
    headers: buildHeaders(sensor),
  });
  if (!response.ok) {
    throw new Error(`Failed to get status: ${response.status}`);
  }
  return response.json();
}

export async function enrollFingerprint(
  sensor: SensorConfig,
  id: number,
  name: string,
): Promise<EnrollResponse> {
  const response = await fetch(
    `${baseUrl(sensor)}/enroll?id=${id}&name=${encodeURIComponent(name)}`,
    {
      method: 'POST',
      headers: buildHeaders(sensor),
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to start enrollment: ${response.status}`);
  }
  return response.json();
}

export async function cancelEnrollment(sensor: SensorConfig): Promise<void> {
  const response = await fetch(`${baseUrl(sensor)}/cancel`, {
    method: 'POST',
    headers: buildHeaders(sensor),
  });
  if (!response.ok) {
    throw new Error(`Failed to cancel enrollment: ${response.status}`);
  }
}

export async function deleteFingerprint(sensor: SensorConfig, id: number): Promise<void> {
  const response = await fetch(`${baseUrl(sensor)}/delete?id=${id}`, {
    method: 'POST',
    headers: buildHeaders(sensor),
  });
  if (!response.ok) {
    throw new Error(`Failed to delete fingerprint: ${response.status}`);
  }
}

export async function deleteAllFingerprints(sensor: SensorConfig): Promise<void> {
  const response = await fetch(`${baseUrl(sensor)}/delete_all`, {
    method: 'POST',
    headers: buildHeaders(sensor),
  });
  if (!response.ok) {
    throw new Error(`Failed to delete all fingerprints: ${response.status}`);
  }
}

export async function renameFingerprint(
  sensor: SensorConfig,
  id: number,
  name: string,
): Promise<void> {
  const response = await fetch(
    `${baseUrl(sensor)}/rename?id=${id}&name=${encodeURIComponent(name)}`,
    {
      method: 'POST',
      headers: buildHeaders(sensor),
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to rename fingerprint: ${response.status}`);
  }
}
