import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { apiService } from '../services/api';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'CompanySetup'>;

export default function CompanySetupScreen({ navigation, route }: Props) {
  const { email } = route.params;
  const [companyName, setCompanyName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const domain = email.split('@')[1];

  async function setupCompany() {
    if (!companyName || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      // 1️⃣ Create company
      await apiService.createCompany(companyName, domain);

      // 2️⃣ Sign up user
      const { error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) throw signUpError;

      // 3️⃣ Sign in immediately
      const { data: { session }, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;

      // 4️⃣ Navigate to ProfileSetup
      navigation.replace('ProfileSetup', { email });
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Setup Your Company</Text>
          <Text style={styles.subtitle}>We'll create a company profile for domain: {domain}</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Company Name</Text>
          <TextInput style={styles.input} placeholder="Acme Corp" value={companyName} onChangeText={setCompanyName} />

          <Text style={styles.label}>Your Password</Text>
          <TextInput style={styles.input} placeholder="Create a password" value={password} onChangeText={setPassword} secureTextEntry />
          <Text style={styles.helper}>This will be your login password</Text>

          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={setupCompany} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Creating Company...' : 'Create Company & Account'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  header: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1f2937', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
  form: { gap: 24 },
  label: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  helper: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  button: { backgroundColor: '#6366f1', paddingVertical: 16, borderRadius: 12, alignItems: 'center', shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4.65, elevation: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
});
