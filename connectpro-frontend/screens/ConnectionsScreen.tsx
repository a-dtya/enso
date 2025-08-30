import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { apiService } from '../services/api';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'Connections'>;

interface Connection {
  id: string;
  requester_id: string;
  target_id: string;
  status: 'pending' | 'accepted' | 'declined';
  message?: string;
  created_at: string;
}

interface ConnectionWithProfile extends Connection {
  profile: {
    full_name: string;
    role?: string;
    email: string;
  };
}

export default function ConnectionsScreen({ navigation }: Props) {
  const [connections, setConnections] = useState<{
    sent: ConnectionWithProfile[];
    received: ConnectionWithProfile[];
    }>({ sent: [], received: [] });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');

  useEffect(() => {
    loadConnections();
  }, []);

  async function loadConnections() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const connections = await apiService.getMyConnections(session.access_token);
      console.log('Fetched connections:', connections);
      setConnections(connections);
    } catch (error) {
      Alert.alert('Error', 'Failed to load connections');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadConnections();
  }

  async function updateConnection(connectionId: string, status: 'accepted' | 'declined') {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      await apiService.updateConnection(connectionId, status, session.access_token);
      await loadConnections(); // Reload to get updated data
      
      Alert.alert(
        'Success',
        status === 'accepted' ? 'Connection accepted!' : 'Connection declined'
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to update connection');
    }
  }

  const renderConnectionCard = (connection: ConnectionWithProfile, isReceived: boolean) => {
    const profile = connection.profile;
    const statusColors = {
      pending: '#f59e0b',
      accepted: '#10b981',
      declined: '#ef4444',
    };

    return (
      <View key={connection.id} style={styles.connectionCard}>
        <View style={styles.connectionHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile.full_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.connectionInfo}>
            <Text style={styles.connectionName}>{profile.full_name}</Text>
            <Text style={styles.connectionRole}>{profile.role || 'No role'}</Text>
            <Text style={styles.connectionEmail}>{profile.email}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColors[connection.status] }]}>
            <Text style={styles.statusText}>
              {connection.status.charAt(0).toUpperCase() + connection.status.slice(1)}
            </Text>
          </View>
        </View>

        {connection.message && (
          <View style={styles.messageContainer}>
            <Text style={styles.messageLabel}>
              {isReceived ? 'Their message:' : 'Your message:'}
            </Text>
            <Text style={styles.messageText}>{connection.message}</Text>
          </View>
        )}

        <View style={styles.connectionFooter}>
          <Text style={styles.dateText}>
            {new Date(connection.created_at).toLocaleDateString()}
          </Text>

          {isReceived && connection.status === 'pending' && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.declineButton]}
                onPress={() => updateConnection(connection.id, 'declined')}
              >
                <Text style={styles.declineButtonText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={() => updateConnection(connection.id, 'accepted')}
              >
                <Text style={styles.acceptButtonText}>Accept</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading connections...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentConnections = activeTab === 'received' ? connections.received : connections.sent;

  return (
    <SafeAreaView style={styles.container}>
      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'received' && styles.activeTab]}
          onPress={() => setActiveTab('received')}
        >
          <Text style={[styles.tabText, activeTab === 'received' && styles.activeTabText]}>
            Received ({connections.received.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sent' && styles.activeTab]}
          onPress={() => setActiveTab('sent')}
        >
          <Text style={[styles.tabText, activeTab === 'sent' && styles.activeTabText]}>
            Sent ({connections.sent.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {currentConnections.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {activeTab === 'received' 
                ? 'No connection requests received' 
                : 'No connection requests sent'
              }
            </Text>
            <Text style={styles.emptySubtext}>
              {activeTab === 'received'
                ? 'When people want to connect with you, they\'ll appear here'
                : 'Connection requests you send will appear here'
              }
            </Text>
            <TouchableOpacity
              style={styles.findPeopleButton}
              onPress={() => navigation.navigate('Search')}
            >
              <Text style={styles.findPeopleButtonText}>Find People</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.connectionsContainer}>
            {currentConnections.map(connection => 
              renderConnectionCard(connection, activeTab === 'received')
            )}
          </View>
        )}
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#6366f1',
  },
  tabText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  activeTabText: {
    color: 'white',
    fontWeight: '600',
  },
  scrollContent: {
    padding: 20,
  },
  connectionsContainer: {
    gap: 16,
  },
  connectionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  connectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#3730a3',
    fontSize: 18,
    fontWeight: 'bold',
  },
  connectionInfo: {
    flex: 1,
  },
  connectionName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  connectionRole: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 1,
  },
  connectionEmail: {
    fontSize: 12,
    color: '#9ca3af',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  messageContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  messageLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  messageText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  connectionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  declineButton: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  declineButtonText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '600',
  },
  acceptButton: {
    backgroundColor: '#6366f1',
  },
  acceptButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  findPeopleButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  findPeopleButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});