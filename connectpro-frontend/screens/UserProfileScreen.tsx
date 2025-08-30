import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { apiService, Profile } from '../services/api';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'UserProfile'>;

export default function UserProfileScreen({ route, navigation }: Props) {
  const { userId } = route.params;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectModalVisible, setConnectModalVisible] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState('');
  const [sendingConnection, setSendingConnection] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    loadProfile();
    checkConnection();
  }, []);

  // Function to check if the viewed user is already connected
  async function checkConnection() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      // Fetch connections of the session user
      const connections = await apiService.getMyConnections(session.access_token);

      // get user details using userId
      const user = await apiService.getProfile(userId, session.access_token);

      // Check if userId exists in sent or received connections
      const alreadyConnected =
        connections.sent.some(c => c.profile.full_name === user.full_name && c.status === 'accepted' && c.profile.email === user.email) ||
        connections.received.some(c => c.profile.full_name === user.full_name && c.status === 'accepted' && c.profile.email === user.email);

      setIsConnected(alreadyConnected);
    } catch (error) {
      console.log('Error checking connection in UserProfileScreen:', error);
    }
  }

  async function loadProfile() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const userProfile = await apiService.getProfile(userId, session.access_token);
      setProfile(userProfile);
    } catch (error) {
      Alert.alert('Error', 'Failed to load profile');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }

  async function sendConnectionRequest() {
    if (!connectionMessage.trim()) {
      Alert.alert('Error', 'Please add a message');
      return;
    }

    setSendingConnection(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      await apiService.createConnectionRequest(
        userId,
        connectionMessage,
        session.access_token
      );

      setConnectModalVisible(false);
      setConnectionMessage('');
      Alert.alert('Success', 'Connection request sent!');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to send request');
    } finally {
      setSendingConnection(false);
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

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text>Profile not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile.full_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.profileName}>{profile.full_name}</Text>
          <Text style={styles.profileEmail}>{profile.email}</Text>
          
          {/* Status */}
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusDot,
              { backgroundColor: profile.availability_status === 'available' ? '#10b981' : '#f59e0b' }
            ]} />
            <Text style={styles.statusText}>
              {profile.availability_status === 'available' ? 'Available' : 'Busy'}
            </Text>
          </View>

          {/* Connect Button */}
          <TouchableOpacity
            style={[styles.connectButton, isConnected && styles.connectButtonDisabled]}
            onPress={() => setConnectModalVisible(true)}
            disabled={isConnected}
          >
            <Text style={styles.connectButtonText}>{isConnected ? 'Connected' : 'Connect'}</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Details */}
        <View style={styles.detailsSection}>
          {profile.role && (
            <View style={styles.detailCard}>
              <Text style={styles.detailLabel}>Role</Text>
              <Text style={styles.detailValue}>{profile.role}</Text>
            </View>
          )}

          {profile.department && (
            <View style={styles.detailCard}>
              <Text style={styles.detailLabel}>Department</Text>
              <Text style={styles.detailValue}>{profile.department}</Text>
            </View>
          )}

          {profile.bio && (
            <View style={styles.detailCard}>
              <Text style={styles.detailLabel}>About</Text>
              <Text style={styles.detailValue}>{profile.bio}</Text>
            </View>
          )}

          {profile.skills && profile.skills.length > 0 && (
            <View style={styles.detailCard}>
              <Text style={styles.detailLabel}>Skills & Expertise</Text>
              <View style={styles.skillsContainer}>
                {profile.skills.map((skill, index) => (
                  <View key={index} style={styles.skillTag}>
                    <Text style={styles.skillText}>{skill}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Connection Request Modal */}
      <Modal
        visible={connectModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setConnectModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setConnectModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Connect with {profile.full_name}</Text>
            <View style={styles.modalPlaceholder} />
          </View>

          <View style={styles.modalContent}>
            <View style={styles.modalProfileInfo}>
              <View style={styles.modalAvatar}>
                <Text style={styles.modalAvatarText}>
                  {profile.full_name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={styles.modalProfileName}>{profile.full_name}</Text>
                <Text style={styles.modalProfileRole}>{profile.role || 'No role'}</Text>
              </View>
            </View>

            <View style={styles.messageSection}>
              <Text style={styles.messageLabel}>Add a message</Text>
              <TextInput
                style={styles.messageInput}
                placeholder="Hi, I'd like to connect with you..."
                value={connectionMessage}
                onChangeText={setConnectionMessage}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[styles.sendButton, sendingConnection && styles.sendButtonDisabled]}
              onPress={sendConnectionRequest}
              disabled={sendingConnection}
            >
              <Text style={styles.sendButtonText}>
                {sendingConnection ? 'Sending...' : 'Send Connection Request'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerSection: {
    backgroundColor: 'white',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#3730a3',
    fontSize: 36,
    fontWeight: 'bold',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
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
  connectButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  connectButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  detailsSection: {
    padding: 20,
    gap: 16,
  },
  detailCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 16,
    color: '#1f2937',
    lineHeight: 24,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillTag: {
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  skillText: {
    color: '#0369a1',
    fontSize: 14,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalCloseButton: {
    paddingVertical: 4,
  },
  modalCloseText: {
    color: '#6366f1',
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalPlaceholder: {
    width: 60, // Balance the layout
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalProfileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  modalAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalAvatarText: {
    color: '#3730a3',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalProfileName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  modalProfileRole: {
    fontSize: 14,
    color: '#6b7280',
  },
  messageSection: {
    marginBottom: 24,
  },
  messageLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  messageInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    height: 100,
    textAlignVertical: 'top',
  },
  sendButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  connectButtonDisabled: {
  backgroundColor: '#9ca3af', // greyed out
  shadowOpacity: 0,
  }

});