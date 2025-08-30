import React, { useEffect, useState } from 'react';
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
import { apiService, Profile } from '../services/api';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export default function ProfileScreen({ navigation }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('');
  const [department, setDepartment] = useState('');
  const [bio, setBio] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [availabilityStatus, setAvailabilityStatus] = useState('available');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const userProfile = await apiService.getMyProfile(session.access_token);
      setProfile(userProfile);
      
      // Set form values
      setFullName(userProfile.full_name);
      setRole(userProfile.role || '');
      setDepartment(userProfile.department || '');
      setBio(userProfile.bio || '');
      setSkills(userProfile.skills || []);
      setAvailabilityStatus(userProfile.availability_status);
    } catch (error) {
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }

  function addSkill() {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput('');
    }
  }

  function removeSkill(skillToRemove: string) {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  }

  async function saveProfile() {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Full name is required');
      return;
    }

    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      await apiService.updateMyProfile({
        full_name: fullName,
        role: role || undefined,
        department: department || undefined,
        bio: bio || undefined,
        skills: skills,
        availability_status: availabilityStatus,
      }, session.access_token);

      setEditing(false);
      await loadProfile(); // Reload to get updated data
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    setEditing(false);
    // Reset form to original values
    if (profile) {
      setFullName(profile.full_name);
      setRole(profile.role || '');
      setDepartment(profile.department || '');
      setBio(profile.bio || '');
      setSkills(profile.skills || []);
      setAvailabilityStatus(profile.availability_status);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
            <Text style={styles.email}>{profile?.email}</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={[styles.input, !editing && styles.inputDisabled]}
                value={fullName}
                onChangeText={setFullName}
                editable={editing}
              />
            </View>

            <View>
              <Text style={styles.label}>Role</Text>
              <TextInput
                style={[styles.input, !editing && styles.inputDisabled]}
                value={role}
                onChangeText={setRole}
                placeholder="Your job title"
                editable={editing}
              />
            </View>

            <View>
              <Text style={styles.label}>Department</Text>
              <TextInput
                style={[styles.input, !editing && styles.inputDisabled]}
                value={department}
                onChangeText={setDepartment}
                placeholder="Your department"
                editable={editing}
              />
            </View>

            <View>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea, !editing && styles.inputDisabled]}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell colleagues about yourself"
                multiline
                numberOfLines={3}
                editable={editing}
              />
            </View>

            <View>
              <Text style={styles.label}>Availability</Text>
              <View style={styles.statusContainer}>
                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    availabilityStatus === 'available' && styles.statusButtonActive
                  ]}
                  onPress={() => editing && setAvailabilityStatus('available')}
                  disabled={!editing}
                >
                  <View style={[styles.statusDot, { backgroundColor: '#10b981' }]} />
                  <Text style={[
                    styles.statusButtonText,
                    availabilityStatus === 'available' && styles.statusButtonTextActive
                  ]}>
                    Available
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    availabilityStatus === 'busy' && styles.statusButtonActive
                  ]}
                  onPress={() => editing && setAvailabilityStatus('busy')}
                  disabled={!editing}
                >
                  <View style={[styles.statusDot, { backgroundColor: '#f59e0b' }]} />
                  <Text style={[
                    styles.statusButtonText,
                    availabilityStatus === 'busy' && styles.statusButtonTextActive
                  ]}>
                    Busy
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View>
              <Text style={styles.label}>Skills & Expertise</Text>
              {editing && (
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
              )}
              
              <View style={styles.skillsContainer}>
                {skills.map((skill, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.skillTag}
                    onPress={() => editing && removeSkill(skill)}
                    disabled={!editing}
                  >
                    <Text style={styles.skillText}>{skill}</Text>
                    {editing && <Text style={styles.removeSkill}>×</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            {editing ? (
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={cancelEdit}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.button, styles.saveButton, saving && styles.buttonDisabled]}
                  onPress={saveProfile}
                  disabled={saving}
                >
                  <Text style={styles.saveButtonText}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.button, styles.editButton]}
                onPress={() => setEditing(true)}
              >
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
  },
  email: {
    fontSize: 16,
    color: '#6b7280',
  },
  form: {
    gap: 20,
    marginBottom: 32,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  inputDisabled: {
    backgroundColor: '#f9fafb',
    color: '#6b7280',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statusButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
  },
  statusButtonActive: {
    borderColor: '#6366f1',
    backgroundColor: '#f0f9ff',
  },
  statusButtonText: {
    fontSize: 16,
    color: '#6b7280',
  },
  statusButtonTextActive: {
    color: '#6366f1',
    fontWeight: '600',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  skillInputContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  skillInput: {
    flex: 1,
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  addButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillTag: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  skillText: {
    color: '#3730a3',
    fontSize: 14,
  },
  removeSkill: {
    color: '#3730a3',
    fontSize: 16,
    fontWeight: 'bold',
  },
  actions: {
    marginBottom: 20,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#6366f1',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  editButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#6366f1',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});