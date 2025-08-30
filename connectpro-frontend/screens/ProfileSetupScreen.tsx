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
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { apiService } from '../services/api';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileSetup'>;

export default function ProfileSetupScreen({ route, navigation }: Props) {
  const { email } = route.params;

  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('');
  const [department, setDepartment] = useState('');
  const [bio, setBio] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Add a skill
  function addSkill() {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setSkillInput('');
    }
  }

  // Remove a skill
  function removeSkill(skillToRemove: string) {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  }

  // Create profile
  async function createProfile() {
    console.log("▶️ Creating profile with:", { fullName, email, role, department, bio, skills });
    setLoading(true);

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;

      if (!session?.access_token) {
        Alert.alert('Error', 'Session not found. Please log in again.');
        setLoading(false);
        return;
      }

      const result = await apiService.createProfile(
        {
          full_name: fullName,
          email,
          role: role || undefined,
          department: department || undefined,
          bio: bio || undefined,
          skills,
        },
        session.access_token
      );

      console.log("✅ Profile created:", result);

      Alert.alert('Success', 'Profile created successfully!', [
        { text: 'OK', onPress: () => navigation.replace('Home') }
      ]);

    } catch (err: any) {
      console.error("❌ Profile creation error:", err);
      Alert.alert('Error', err.message || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Complete Your Profile</Text>
            <Text style={styles.subtitle}>Help your colleagues find you</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="John Doe"
              value={fullName}
              onChangeText={setFullName}
            />

            <Text style={styles.label}>Role</Text>
            <TextInput
              style={styles.input}
              placeholder="Software Engineer, Product Manager, etc."
              value={role}
              onChangeText={setRole}
            />

            <Text style={styles.label}>Department</Text>
            <TextInput
              style={styles.input}
              placeholder="Engineering, Marketing, Sales, etc."
              value={department}
              onChangeText={setDepartment}
            />

            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tell us about yourself..."
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.label}>Skills & Expertise</Text>
            <View style={styles.skillInputContainer}>
              <TextInput
                style={styles.skillInput}
                placeholder="Add a skill"
                value={skillInput}
                onChangeText={setSkillInput}
                onSubmitEditing={addSkill}
              />
              <TouchableOpacity style={styles.addButton} onPress={addSkill}>
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.skillsContainer}>
              {skills.map((skill, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.skillTag}
                  onPress={() => removeSkill(skill)}
                >
                  <Text style={styles.skillText}>{skill}</Text>
                  <Text style={styles.removeSkill}>×</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={createProfile}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Creating Profile...' : 'Complete Setup'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { flex: 1 },
  scrollContent: { paddingHorizontal: 32, paddingVertical: 20 },
  header: { alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1f2937', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6b7280', textAlign: 'center' },
  form: { gap: 16 },
  label: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  textArea: { height: 80, textAlignVertical: 'top' },
  skillInputContainer: { flexDirection: 'row', gap: 8 },
  skillInput: { flex: 1, backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  addButton: { backgroundColor: '#6366f1', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, justifyContent: 'center' },
  addButtonText: { color: 'white', fontWeight: '600' },
  skillsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  skillTag: { backgroundColor: '#e0e7ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 4 },
  skillText: { color: '#3730a3', fontSize: 14 },
  removeSkill: { color: '#3730a3', fontSize: 16, fontWeight: 'bold' },
  button: { backgroundColor: '#6366f1', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
});
