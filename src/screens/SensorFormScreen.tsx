import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SensorConfig } from '../types';
import { addSensor, updateSensor } from '../services/storage';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'SensorForm'>;

export default function SensorFormScreen({ route, navigation }: Props) {
  const existing = route.params?.sensor;
  const isEditing = !!existing;

  const [name, setName] = useState(existing?.name ?? '');
  const [ipAddress, setIpAddress] = useState(existing?.ipAddress ?? '');
  const [apiKey, setApiKey] = useState(existing?.apiKey ?? '');

  const ipInputRef = useRef<TextInput>(null);
  const apiKeyInputRef = useRef<TextInput>(null);

  useEffect(() => {
    navigation.setOptions({
      title: isEditing ? 'Edit Doorbell' : 'Add Doorbell',
      headerLeft: Platform.OS === 'web' ? () => (
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
      ) : undefined,
    });
  }, [isEditing, navigation]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a doorbell name.');
      return;
    }
    if (!ipAddress.trim()) {
      Alert.alert('Error', 'Please enter the IP address.');
      return;
    }

    const sensor: SensorConfig = {
      id: existing?.id ?? Date.now().toString(),
      name: name.trim(),
      ipAddress: ipAddress.trim(),
      apiKey: apiKey.trim(),
    };

    if (isEditing) {
      await updateSensor(sensor);
    } else {
      await addSensor(sensor);
    }

    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Front Door"
          autoFocus={!isEditing}
          returnKeyType="next"
          onSubmitEditing={() => ipInputRef.current?.focus()}
        />

        <Text style={styles.label}>IP Address</Text>
        <TextInput
          ref={ipInputRef}
          style={styles.input}
          value={ipAddress}
          onChangeText={setIpAddress}
          placeholder="e.g. 192.168.1.100"
          keyboardType="url"
          autoCapitalize="none"
          returnKeyType="next"
          onSubmitEditing={() => apiKeyInputRef.current?.focus()}
        />

        <Text style={styles.label}>API Key (optional)</Text>
        <TextInput
          ref={apiKeyInputRef}
          style={styles.input}
          value={apiKey}
          onChangeText={setApiKey}
          placeholder="Bearer token for authentication"
          autoCapitalize="none"
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={handleSave}
        />

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveText}>{isEditing ? 'Update' : 'Add Doorbell'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { padding: 20 },
  backButton: { paddingHorizontal: 12, paddingVertical: 8 },
  backArrow: { fontSize: 24, color: '#333' },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  saveButton: {
    backgroundColor: '#4a90d9',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
