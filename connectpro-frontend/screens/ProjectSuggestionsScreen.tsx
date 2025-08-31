import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { supabase } from '../lib/supabase';
import { apiService, SkillMatch } from '../services/api';

type ProjectSuggestionsScreenProps = NativeStackScreenProps<RootStackParamList, 'ProjectSuggestions'>;

const ProjectSuggestionsScreen: React.FC<ProjectSuggestionsScreenProps> = ({ route }) => {
  const { projectId } = route.params;
  const [suggestions, setSuggestions] = useState<SkillMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToProject, setAddingToProject] = useState<string | null>(null);

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      Alert.alert('Error', 'You must be logged in to view suggestions');
      return;
    }

    setLoading(true);
    try {
      const data = await apiService.getProjectSuggestions(
        projectId, 
        session.access_token
      );
      setSuggestions(data);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      Alert.alert(
        'Error', 
        error instanceof Error ? error.message : 'Failed to fetch suggestions'
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
        await apiService.addProjectMember(
          projectId,
          profileId,
          session.access_token
        );

        // For now, just show success message
        Alert.alert(
            'Success', 
            `${name} has been added to the project!`,
            [
            {
                text: 'OK',
                onPress: () => {
                // Remove from suggestions list
                setSuggestions(prev => prev.filter(s => s.profile_id !== profileId));
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

  const renderSuggestion = ({ item }: { item: SkillMatch }) => (
    <View style={{
      backgroundColor: 'white',
      padding: 15,
      marginVertical: 5,
      borderRadius: 8,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 2
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{item.name}</Text>
          <Text style={{ color: '#666', marginBottom: 5 }}>{item.role}</Text>
          <Text style={{ fontSize: 12, color: '#333' }}>
            Matching Skills: {item.matching_skills.join(', ')}
          </Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{
            fontSize: 24,
            fontWeight: 'bold',
            color: item.skill_match_percentage >= 70 ? '#4CAF50' : '#FF9800'
          }}>
            {item.skill_match_percentage}%
          </Text>
          <TouchableOpacity
            onPress={() => handleAddToProject(item.profile_id, item.name)}
            disabled={addingToProject === item.profile_id}
            style={{
              backgroundColor: addingToProject === item.profile_id ? '#ccc' : '#007AFF',
              paddingHorizontal: 15,
              paddingVertical: 5,
              borderRadius: 15,
              marginTop: 5,
              minWidth: 90,
              alignItems: 'center'
            }}
          >
            {addingToProject === item.profile_id ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={{ color: 'white', fontSize: 12 }}>Add to Project</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 10, color: '#666' }}>Finding team members...</Text>
      </View>
    );
  }

  if (suggestions.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 18, textAlign: 'center', color: '#666' }}>
          No team members found with matching skills.
        </Text>
        <Text style={{ fontSize: 14, textAlign: 'center', color: '#999', marginTop: 10 }}>
          Try adjusting the required skills for this project.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        Suggested Team Members
      </Text>

      <FlatList
        data={suggestions}
        renderItem={renderSuggestion}
        keyExtractor={(item) => item.profile_id}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={fetchSuggestions}
      />
    </View>
  );
};

export default ProjectSuggestionsScreen;