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
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { apiService, Project } from '../services/api';
import { supabase } from '../lib/supabase';
import { canCreateProjects } from '../utils/projectRoles';

type Props = NativeStackScreenProps<RootStackParamList, 'ProjectsList'>;

interface ProjectWithMembers extends Project {
  member_count?: number;
  created_by_name?: string;
}

export default function ProjectsListScreen({ navigation }: Props) {
  const [projects, setProjects] = useState<ProjectWithMembers[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      // Get user profile to check role
      const userProfile = await apiService.getMyProfile(session.access_token);
      setUserRole(userProfile.role || '');

      // Get all company projects (you'll need to implement this API endpoint)
      const companyProjects = await apiService.getCompanyProjects(session.access_token);
      setProjects(companyProjects);

    } catch (error) {
      console.error('Error loading projects:', error);
      Alert.alert('Error', 'Failed to load projects');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadProjects();
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning':
        return '#f59e0b'; // yellow
      case 'active':
        return '#10b981'; // green
      case 'completed':
        return '#6b7280'; // gray
      default:
        return '#6b7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'planning':
        return 'Planning';
      case 'active':
        return 'Active';
      case 'completed':
        return 'Completed';
      default:
        return 'Unknown';
    }
  };

  const renderProject = (project: ProjectWithMembers) => (
    <TouchableOpacity
      key={project.id}
      style={styles.projectCard}
      onPress={() => navigation.navigate('ProjectDetails', { projectId: project.id })}
    >
      <View style={styles.projectHeader}>
        <View style={styles.projectInfo}>
          <Text style={styles.projectName}>{project.name}</Text>
          <Text style={styles.projectDescription} numberOfLines={2}>
            {project.description || 'No description available'}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(project.status) }]}>
          <Text style={styles.statusText}>{getStatusText(project.status)}</Text>
        </View>
      </View>

      <View style={styles.projectDetails}>
        <View style={styles.skillsContainer}>
          <Text style={styles.skillsLabel}>Required Skills:</Text>
          <View style={styles.skillsWrapper}>
            {project.required_skills.slice(0, 3).map((skill, index) => (
              <View key={index} style={styles.skillTag}>
                <Text style={styles.skillText}>{skill}</Text>
              </View>
            ))}
            {project.required_skills.length > 3 && (
              <Text style={styles.moreSkills}>
                +{project.required_skills.length - 3} more
              </Text>
            )}
          </View>
        </View>

        <View style={styles.projectMeta}>
          <Text style={styles.metaText}>
            👥 {project.member_count || 0} members
          </Text>
          <Text style={styles.metaText}>
            📅 {new Date(project.created_at).toLocaleDateString()}
          </Text>
          {project.created_by_name && (
            <Text style={styles.metaText}>
              👤 Created by {project.created_by_name}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.projectActions}>
        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => navigation.navigate('ProjectDetails', { projectId: project.id })}
        >
          <Text style={styles.viewButtonText}>View Details</Text>
        </TouchableOpacity>
        
        {canCreateProjects(userRole) && (
          <TouchableOpacity
            style={styles.manageButton}
            onPress={() => navigation.navigate('ProjectSuggestions', { projectId: project.id })}
          >
            <Text style={styles.manageButtonText}>Manage Team</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading projects...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Company Projects</Text>
          <Text style={styles.subtitle}>
            {projects.length} project{projects.length !== 1 ? 's' : ''} total
          </Text>
        </View>
        
        {canCreateProjects(userRole) && (
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => navigation.navigate('CreateProject')}
          >
            <Text style={styles.createButtonText}>+ New</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {projects.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No Projects Yet</Text>
            <Text style={styles.emptyStateText}>
              {canCreateProjects(userRole)
                ? 'Create your first project to get started'
                : 'No projects have been created yet'
              }
            </Text>
            {canCreateProjects(userRole) && (
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => navigation.navigate('CreateProject')}
              >
                <Text style={styles.emptyStateButtonText}>Create Project</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.projectsList}>
            {projects.map(renderProject)}
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
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  createButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  scrollContent: {
    padding: 20,
  },
  projectsList: {
    gap: 16,
  },
  projectCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  projectInfo: {
    flex: 1,
    marginRight: 12,
  },
  projectName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  projectDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
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
  projectDetails: {
    marginBottom: 16,
  },
  skillsContainer: {
    marginBottom: 12,
  },
  skillsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  skillsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  skillTag: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  skillText: {
    color: '#3730a3',
    fontSize: 12,
    fontWeight: '500',
  },
  moreSkills: {
    color: '#6b7280',
    fontSize: 12,
    fontStyle: 'italic',
  },
  projectMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaText: {
    fontSize: 12,
    color: '#6b7280',
  },
  projectActions: {
    flexDirection: 'row',
    gap: 8,
  },
  viewButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 14,
  },
  manageButton: {
    flex: 1,
    backgroundColor: '#6366f1',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  manageButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});