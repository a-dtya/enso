import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { supabase } from '../lib/supabase';
import { apiService } from '../services/api';

const CreateProjectScreen = ({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'CreateProject'>) => {
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [requiredSkills, setRequiredSkills] = useState('');
  
  const [loading, setLoading] = useState(false);

  const handleCreateProject = async () => {
    const { data: { session } } = await supabase.auth.getSession();
          if (!session?.access_token){
            Alert.alert('Error', 'You must be logged in to create projects');
            return;
          }
    if (!projectName.trim()) {
      Alert.alert('Error', 'Please enter a project name');
      return;
    }

    if (!requiredSkills.trim()) {
      Alert.alert('Error', 'Please enter required skills');
      return;
    }
    

    setLoading(true);

    try {
      const skillsArray = requiredSkills
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      const response = await apiService.createProject(
        {
          name: projectName,
          description: description.trim() || undefined,
          required_skills: skillsArray,
        },
        session.access_token
      );

      // Navigate to suggestions screen with the created project
      navigation.navigate('ProjectSuggestions', { 
        projectId: response.project.id 
      });

      // Reset form
      setProjectName('');
      setDescription('');
      setRequiredSkills('');

    } catch (error) {
      console.error('Error creating project:', error);
      Alert.alert(
        'Error', 
        error instanceof Error ? error.message : 'Failed to create project'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        Create New Project
      </Text>
      
      <TextInput
        placeholder="Project Name"
        value={projectName}
        onChangeText={setProjectName}
        style={{ borderWidth: 1, padding: 10, marginBottom: 15, borderRadius: 5 }}
      />
      
      <TextInput
        placeholder="Description"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
        style={{ borderWidth: 1, padding: 10, marginBottom: 15, borderRadius: 5 }}
      />
      
      <TextInput
        placeholder="Required Skills (comma separated)"
        value={requiredSkills}
        onChangeText={setRequiredSkills}
        style={{ borderWidth: 1, padding: 10, marginBottom: 20, borderRadius: 5 }}
      />
      
      <TouchableOpacity
        onPress={handleCreateProject}
        style={{ backgroundColor: '#007AFF', padding: 15, borderRadius: 5 }}
      >
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
          Find Team Members
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};