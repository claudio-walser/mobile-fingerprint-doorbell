import AsyncStorage from '@react-native-async-storage/async-storage';
import { SensorConfig } from '../types';

const SENSORS_KEY = 'sensors';

export async function loadSensors(): Promise<SensorConfig[]> {
  const json = await AsyncStorage.getItem(SENSORS_KEY);
  if (!json) return [];
  return JSON.parse(json);
}

export async function saveSensors(sensors: SensorConfig[]): Promise<void> {
  await AsyncStorage.setItem(SENSORS_KEY, JSON.stringify(sensors));
}

export async function addSensor(sensor: SensorConfig): Promise<void> {
  const sensors = await loadSensors();
  sensors.push(sensor);
  await saveSensors(sensors);
}

export async function updateSensor(sensor: SensorConfig): Promise<void> {
  const sensors = await loadSensors();
  const index = sensors.findIndex((s) => s.id === sensor.id);
  if (index !== -1) {
    sensors[index] = sensor;
    await saveSensors(sensors);
  }
}

export async function deleteSensor(id: string): Promise<void> {
  const sensors = await loadSensors();
  await saveSensors(sensors.filter((s) => s.id !== id));
}
