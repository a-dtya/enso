import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { apiService, Profile, ProjectWithMembers } from '../services/api';
import { supabase } from '../lib/supabase';
import { canCreateProjects } from '../utils/projectRoles';
import AppLogo from '../components/AppLogo';
import { moodEmojis, MoodScore } from '../types/mood';
import { Picker } from '@react-native-picker/picker';


type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recentProfiles, setRecentProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMood, setSelectedMood] = useState<MoodScore | null>(null);
  const [moodNote, setMoodNote] = useState<string | undefined>(undefined);
  const [loggingMood, setLoggingMood] = useState(false);
  const [companyProjects, setCompanyProjects] = useState<ProjectWithMembers[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);


  useEffect(() => {
    loadData();
    loadCompanyProjects();
  }, []);

  async function loadData() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log("Session data:", session);
      if (!session?.access_token) return;

      // Load user profile
      const userProfile = await apiService.getMyProfile(session.access_token);
      setProfile(userProfile);

      // Load recent profiles from the company
      const profiles = await apiService.searchProfiles('', session.access_token);
      setRecentProfiles(profiles.slice(0, 3)); // Show first 3

    } catch (error) {
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadCompanyProjects() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const projects = await apiService.getCompanyProjects(session.access_token);
      setCompanyProjects(projects);
    } catch (error) {
      console.error('Failed to load projects', error);
    }
  } 

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
  }

  async function signOut() {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.auth.signOut();
            if (error) {
              Alert.alert('Error', 'Failed to sign out');
            } else {
              navigation.replace('Login');
            }
          },
        },
      ]
    );
  }

  async function handleLogMood() {
    if (!selectedMood) return Alert.alert('Select your mood first');

    setLoggingMood(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      await apiService.logMood(
        selectedMood,
        moodNote,
        selectedProjectId, // optional project tagging
        session.access_token
      );

      Alert.alert('Success', 'Your mood has been logged!');
      setSelectedMood(null);
      setMoodNote(undefined);
      setSelectedProjectId(undefined);
    } catch (err: unknown) {
      const error = err as { status?: number; detail?: string };

      if (error.status === 400) {
        Alert.alert('Error', 'You have already logged your mood for today.');
      } else {
        Alert.alert('Error', 'Failed to log mood');
      }
    } finally {
      setLoggingMood(false);
    }
  }

  if (loading && !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const userCanCreateProjects = canCreateProjects(profile?.role?.toLowerCase() || '');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <AppLogo />
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{profile?.full_name || 'User'}</Text>
          </View>
          <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <TouchableOpacity
          style={styles.profileCard}
          onPress={() => navigation.navigate('Profile')}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile?.full_name}</Text>
            <Text style={styles.profileRole}>{profile?.role || 'No role set'}</Text>
            <Text style={styles.profileDepartment}>
              {profile?.department || 'No department'}
            </Text>
          </View>
          <Text style={styles.editText}>Edit →</Text>
        </TouchableOpacity>

        {/* Project Management Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Project Management</Text>
          <View style={styles.projectActions}>
            <TouchableOpacity
              style={[styles.projectCard, styles.viewProjectsCard]}
              onPress={() => navigation.navigate('ProjectsList')}
            >
              <Text style={styles.projectIcon}>📋</Text>
              <Text style={styles.projectTitle}>View Projects</Text>
              <Text style={styles.projectSubtitle}>See all company projects</Text>
            </TouchableOpacity>

            {userCanCreateProjects && (
              <TouchableOpacity
                style={[styles.projectCard, styles.createProjectCard]}
                onPress={() => navigation.navigate('CreateProject')}
              >
                <Text style={styles.projectIcon}>➕</Text>
                <Text style={styles.projectTitle}>Create Project</Text>
                <Text style={styles.projectSubtitle}>Start a new project</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Search')}
            >
              <Text style={styles.actionIcon}>🔍</Text>
              <Text style={styles.actionTitle}>Find People</Text>
              <Text style={styles.actionSubtitle}>Search by skills or name</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Connections')}
            >
              <Text style={styles.actionIcon}>🤝</Text>
              <Text style={styles.actionTitle}>Connections</Text>
              <Text style={styles.actionSubtitle}>Manage requests</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent People */}
        {recentProfiles.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>People in Your Company</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Search')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            
            {recentProfiles.map((person) => (
              <TouchableOpacity
                key={person.id}
                style={styles.personCard}
                onPress={() => navigation.navigate('UserProfile', { userId: person.id })}
              >
                <View style={styles.personAvatar}>
                  <Text style={styles.personAvatarText}>
                    {person.full_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.personInfo}>
                  <Text style={styles.personName}>{person.full_name}</Text>
                  <Text style={styles.personRole}>{person.role || 'No role'}</Text>
                  {person.skills.length > 0 && (
                    <Text style={styles.personSkills}>
                      {person.skills.slice(0, 2).join(', ')}
                      {person.skills.length > 2 && ` +${person.skills.length - 2} more`}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Mood Logging Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How are you feeling today?</Text>
          <View style={styles.moodRow}>
            {moodEmojis.map((m) => (
              <TouchableOpacity
                key={m.score}
                style={[
                  styles.moodEmoji,
                  selectedMood === m.score && styles.moodSelected
                ]}
                onPress={() => setSelectedMood(m.score as MoodScore)}
              >
                <Text style={styles.moodText}>{m.emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.moodInput}
            placeholder="Add a note (optional)"
            value={moodNote}
            onChangeText={setMoodNote}
          />

          <View style={{ marginVertical: 12 }}>
            <Text style={{ marginBottom: 4, fontWeight: '600' }}>Tag a Project (optional)</Text>
            <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8 }}>
              <Picker
                selectedValue={selectedProjectId}
                onValueChange={(value) => setSelectedProjectId(value)}
              >
                <Picker.Item label="None" value={undefined} />
                {companyProjects.map((proj) => (
                  <Picker.Item key={proj.id} label={proj.name} value={proj.id} />
                ))}
              </Picker>
            </View>
          </View>

          <TouchableOpacity
            style={styles.logMoodButton}
            onPress={handleLogMood}
            disabled={loggingMood}
          >
            {loggingMood ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.logMoodText}>Log Mood</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Status Card */}
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Your Status</Text>
          <View style={styles.statusRow}>
            <View style={[
              styles.statusDot,
              { backgroundColor: profile?.availability_status === 'available' ? '#10b981' : '#f59e0b' }
            ]} />
            <Text style={styles.statusText}>
              {profile?.availability_status === 'available' ? 'Available' : 'Busy'}
            </Text>
          </View>
        </View>
      </ScrollView>
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
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    color: '#6b7280',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  signOutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
  },
  signOutText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '600',
  },
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  profileDepartment: {
    fontSize: 12,
    color: '#9ca3af',
  },
  editText: {
    color: '#6366f1',
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  seeAllText: {
    color: '#6366f1',
    fontWeight: '600',
  },
  // Project Management Styles
  projectActions: {
    flexDirection: 'row',
    gap: 12,
  },
  projectCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  viewProjectsCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  createProjectCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  projectIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  projectTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  projectSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  // Existing styles
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  personCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  personAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  personAvatarText: {
    color: '#3730a3',
    fontSize: 18,
    fontWeight: 'bold',
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  personRole: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  personSkills: {
    fontSize: 12,
    color: '#9ca3af',
  },
  statusCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#6b7280',
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 12,
  },
  moodEmoji: {
    fontSize: 32,
    padding: 12,
    borderRadius: 12,
  },
  moodSelected: {
    backgroundColor: '#e0e7ff',
  },
  moodText: {
    fontSize: 28,
  },
  moodInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  logMoodButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    alignItems: 'center',
  },
  logMoodText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  }
});