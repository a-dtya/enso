import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { supabase } from '../lib/supabase';
import { apiService, SkillMatch, Profile } from '../services/api';

type ProjectSuggestionsScreenProps = NativeStackScreenProps<RootStackParamList, 'ProjectSuggestions'>;

const ProjectSuggestionsScreen: React.FC<ProjectSuggestionsScreenProps> = ({ route }) => {
  const { projectId } = route.params;

  const [existingMembers, setExistingMembers] = useState<Profile[]>([]);
  const [suggestions, setSuggestions] = useState<SkillMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToProject, setAddingToProject] = useState<string | null>(null);

  useEffect(() => {
    fetchMembersAndSuggestions();
  }, []);

  const fetchMembersAndSuggestions = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      Alert.alert('Error', 'You must be logged in to view this page');
      return;
    }

    setLoading(true);
    try {
      const [members, suggested] = await Promise.all([
        apiService.getProjectMembers(projectId, session.access_token),
        apiService.getProjectSuggestions(projectId, session.access_token),
      ]);

      setExistingMembers(members);
      const filteredSuggestions = suggested.filter(
        s => !members.some(m => m.id === s.profile_id)
      );
      setSuggestions(filteredSuggestions);
    } catch (error) {
      console.error('Error fetching members or suggestions:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to fetch members or suggestions'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAddToProject = async (profileId: string, name: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      Alert.alert('Error', 'You must be logged in to add members');
      return;
    }

    setAddingToProject(profileId);

    try {
      await apiService.addProjectMember(projectId, profileId, session.access_token);

      Alert.alert(
        'Success',
        `${name} has been added to the project!`,
        [
          {
            text: 'OK',
            onPress: () => {
              const addedMember = suggestions.find(s => s.profile_id === profileId);
              if (addedMember) {
                setExistingMembers(prev => [...prev, {
                  id: addedMember.profile_id,
                  full_name: addedMember.name,
                  email: '',
                  skills: addedMember.matching_skills,
                  company_id: '',
                  avatar_url: '',
                  availability_status: '',
                  created_at: '',
                  updated_at: '',
                }]);
                setSuggestions(prev => prev.filter(s => s.profile_id !== profileId));
              }
            }
          }
        ]
      );

    } catch (error) {
      console.error('Error adding to project:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to add member to project'
      );
    } finally {
      setAddingToProject(null);
    }
  };

  const renderExistingMember = ({ item }: { item: Profile }) => (
    <View style={styles.existingCard}>
      <Text style={styles.memberName}>{item.full_name}</Text>
      {item.role && <Text style={styles.memberRole}>{item.role}</Text>}
      {item.skills?.length > 0 && (
        <Text style={styles.memberSkills}>Skills: {item.skills.join(', ')}</Text>
      )}
      <Text style={styles.alreadyLabel}>Already in Project</Text>
    </View>
  );

  const renderSuggestedMember = ({ item }: { item: SkillMatch }) => (
    <View style={styles.suggestionCard}>
      <Text style={styles.memberName}>{item.name}</Text>
      <Text style={styles.memberRole}>{item.role}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
        {item.matching_skills.map(skill => (
          <View key={skill} style={styles.skillBadge}>
            <Text style={styles.skillText}>{skill}</Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <View style={{
          backgroundColor: item.skill_match_percentage >= 70 ? '#4CAF50' : '#FF9800',
          borderRadius: 12,
          paddingHorizontal: 8,
          paddingVertical: 4
        }}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}>{item.skill_match_percentage}%</Text>
        </View>

        <TouchableOpacity
          onPress={() => handleAddToProject(item.profile_id, item.name)}
          disabled={addingToProject === item.profile_id}
          style={[styles.addButton, addingToProject === item.profile_id && { backgroundColor: '#ccc' }]}
        >
          {addingToProject === item.profile_id ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.addButtonText}>Add</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderHeader = () => (
    <>
      <Text style={styles.sectionTitle}>Current Members</Text>
      {existingMembers.length === 0 && <Text style={styles.emptyText}>No members added yet</Text>}
    </>
  );

  const renderFooter = () => (
    <>
      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Suggested Members</Text>
      {suggestions.length === 0 && <Text style={styles.emptyText}>No suggestions available</Text>}
    </>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 10, color: '#666' }}>Loading team members...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={[...suggestions, ...existingMembers]} // Suggested first
      keyExtractor={(item: any) => item.profile_id || item.id}
      ListHeaderComponent={() => (
        <>
          <Text style={styles.sectionTitle}>Suggested Members</Text>
          {suggestions.length === 0 && <Text style={styles.emptyText}>No suggestions available</Text>}
          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Current Members</Text>
          {existingMembers.length === 0 && <Text style={styles.emptyText}>No members added yet</Text>}
        </>
      )}
      renderItem={({ item }) =>
        'profile_id' in item
          ? renderSuggestedMember({ item })
          : renderExistingMember({ item })
      }
      contentContainerStyle={{ padding: 20 }}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
    />
  );
};

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937', marginBottom: 5 },
  emptyText: { color: '#666', marginBottom: 10 },
  existingCard: {
    backgroundColor: '#f3f4f6',
    padding: 15,
    borderRadius: 12,
  },
  suggestionCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 2,
  },
  memberName: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
  memberRole: { fontSize: 14, color: '#4b5563', marginTop: 2 },
  memberSkills: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  alreadyLabel: { fontSize: 12, color: '#9ca3af', fontStyle: 'italic', marginTop: 5 },
  skillBadge: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 4,
    marginBottom: 4
  },
  skillText: { fontSize: 12, color: '#3730a3' },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 15,
    alignItems: 'center',
    minWidth: 60,
  },
  addButtonText: { color: 'white', fontSize: 12, fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default ProjectSuggestionsScreen;
