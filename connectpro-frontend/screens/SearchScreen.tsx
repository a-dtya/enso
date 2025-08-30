import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { apiService, Profile } from '../services/api';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'Search'>;

export default function SearchScreen({ navigation }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadAllProfiles();
  }, []);

  useEffect(() => {
    filterProfiles();
  }, [searchQuery, profiles]);

  async function loadAllProfiles() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const allProfiles = await apiService.searchProfiles('', session.access_token);
      setProfiles(allProfiles);
      setFilteredProfiles(allProfiles);
    } catch (error) {
      Alert.alert('Error', 'Failed to load profiles');
    } finally {
      setLoading(false);
    }
  }

  function filterProfiles() {
    if (!searchQuery.trim()) {
      setFilteredProfiles(profiles);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = profiles.filter(profile => {
      const searchableText = [
        profile.full_name,
        profile.role || '',
        profile.department || '',
        profile.bio || '',
        ...(profile.skills || [])
      ].join(' ').toLowerCase();

      return searchableText.includes(query);
    });

    setFilteredProfiles(filtered);
  }

  async function performSearch() {
    if (!searchQuery.trim()) {
      setFilteredProfiles(profiles);
      return;
    }

    setSearching(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const results = await apiService.searchProfiles(searchQuery, session.access_token);
      setFilteredProfiles(results);
    } catch (error) {
      Alert.alert('Error', 'Search failed');
    } finally {
      setSearching(false);
    }
  }

  const renderProfile = ({ item }: { item: Profile }) => (
    <TouchableOpacity
      style={styles.profileCard}
      onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
    >
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.full_name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{item.full_name}</Text>
          <Text style={styles.profileRole}>{item.role || 'No role specified'}</Text>
          {item.department && (
            <Text style={styles.profileDepartment}>{item.department}</Text>
          )}
          <View style={styles.statusRow}>
            <View style={[
              styles.statusDot,
              { backgroundColor: item.availability_status === 'available' ? '#10b981' : '#f59e0b' }
            ]} />
            <Text style={styles.statusText}>
              {item.availability_status === 'available' ? 'Available' : 'Busy'}
            </Text>
          </View>
        </View>
      </View>

      {item.bio && (
        <Text style={styles.profileBio} numberOfLines={2}>
          {item.bio}
        </Text>
      )}

      {item.skills && item.skills.length > 0 && (
        <View style={styles.skillsContainer}>
          {item.skills.slice(0, 4).map((skill, index) => (
            <View key={index} style={styles.skillTag}>
              <Text style={styles.skillText}>{skill}</Text>
            </View>
          ))}
          {item.skills.length > 4 && (
            <View style={styles.skillTag}>
              <Text style={styles.skillText}>+{item.skills.length - 4} more</Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading people...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, role, skills..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={performSearch}
            returnKeyType="search"
          />
          <TouchableOpacity
            style={styles.searchButton}
            onPress={performSearch}
            disabled={searching}
          >
            <Text style={styles.searchButtonText}>
              {searching ? '...' : '🔍'}
            </Text>
          </TouchableOpacity>
        </View>

        {searchQuery.length > 0 && (
          <Text style={styles.resultsText}>
            {filteredProfiles.length} result{filteredProfiles.length !== 1 ? 's' : ''} 
            {searchQuery ? ` for "${searchQuery}"` : ''}
          </Text>
        )}
      </View>

      <FlatList
        data={filteredProfiles}
        renderItem={renderProfile}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? 'No people found matching your search' : 'No people in your company yet'}
            </Text>
            {searchQuery && (
              <Text style={styles.emptySubtext}>
                Try searching for skills, roles, or names
              </Text>
            )}
          </View>
        }
      />
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
  searchContainer: {
    padding: 20,
    paddingBottom: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 48,
  },
  searchButtonText: {
    color: 'white',
    fontSize: 16,
  },
  resultsText: {
    fontSize: 14,
    color: '#6b7280',
  },
  listContainer: {
    padding: 20,
    paddingTop: 8,
  },
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  profileHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#3730a3',
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
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
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#6b7280',
  },
  profileBio: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  skillTag: {
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  skillText: {
    color: '#0369a1',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
});