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
  Modal,
  TextInput,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { apiService, Profile, ProjectWithMembers } from '../services/api';
import { supabase } from '../lib/supabase';
import { canCreateProjects } from '../utils/projectRoles';
import { FontAwesome } from "@react-native-vector-icons/fontawesome";
type Props = NativeStackScreenProps<RootStackParamList, 'ProjectDetails'>;

export default function ProjectDetailsScreen({ navigation, route }: Props) {
  const { projectId } = route.params;
  const [project, setProject] = useState<ProjectWithMembers | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<Profile | null>(null);

  useEffect(() => {
    loadProjectDetails();
    loadProjectMembers();
  }, [projectId]);

  async function loadProjectDetails() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      // Get user profile to check role
      const userProfile = await apiService.getMyProfile(session.access_token);
      setUserRole(userProfile.role || '');

      // Get all company projects and find the specific one
      const companyProjects = await apiService.getCompanyProjects(session.access_token);
      const currentProject = companyProjects.find(p => p.id === projectId);
      
      if (currentProject) {
        setProject(currentProject);
      } else {
        Alert.alert('Error', 'Project not found');
        navigation.goBack();
      }

    } catch (error) {
      console.error('Error loading project details:', error);
      Alert.alert('Error', 'Failed to load project details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadProjectMembers() {
    try {
      setLoadingMembers(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const projectMembers = await apiService.getProjectMembers(projectId, session.access_token);
      setMembers(projectMembers);

    } catch (error) {
      console.error('Error loading project members:', error);
      // Don't show alert for member loading errors as it's secondary data
    } finally {
      setLoadingMembers(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([loadProjectDetails(), loadProjectMembers()]);
  }

  async function handleRemoveMember(member: Profile) {
    setMemberToRemove(member);
    setShowRemoveModal(true);
  }

  async function confirmRemoveMember() {
    if (!memberToRemove) return;

    try {
      setRemovingMember(memberToRemove.id);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      await apiService.removeProjectMember(projectId, memberToRemove.id, session.access_token);
      
      // Remove member from local state
      setMembers(prev => prev.filter(m => m.id !== memberToRemove.id));
      
      Alert.alert('Success', `${memberToRemove.full_name} has been removed from the project`);
      
    } catch (error) {
      console.error('Error removing member:', error);
      Alert.alert('Error', 'Failed to remove member from project');
    } finally {
      setRemovingMember(null);
      setShowRemoveModal(false);
      setMemberToRemove(null);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning':
        return '#f59e0b';
      case 'active':
        return '#10b981';
      case 'completed':
        return '#6b7280';
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

  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case 'available':
        return '#10b981';
      case 'busy':
        return '#f59e0b';
      case 'unavailable':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getAvailabilityText = (status: string) => {
    switch (status) {
      case 'available':
        return 'Available';
      case 'busy':
        return 'Busy';
      case 'unavailable':
        return 'Unavailable';
      default:
        return 'Unknown';
    }
  };

  const renderMember = (member: Profile) => (
    <View key={member.id} style={styles.memberCard}>
      {/* --- Member Info --- */}
      <View style={styles.memberHeader}>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{member.full_name}</Text>
          <Text style={styles.memberRole}>{member.role || 'No role specified'}</Text>
          <Text style={styles.memberDepartment}>{member.department || 'No department'}</Text>
        </View>
        
        <View style={styles.memberStatus}>
          <View style={[
            styles.availabilityDot,
            { backgroundColor: getAvailabilityColor(member.availability_status) }
          ]} />
          {/* The remove button is no longer here */}
        </View>
      </View>

      {/* --- Skills & Bio --- */}
      {member.skills && member.skills.length > 0 && (
        <View style={styles.memberSkills}>
          <Text style={styles.skillsLabel}>Skills:</Text>
          <View style={styles.skillsWrapper}>
            {member.skills.slice(0, 4).map((skill, index) => (
              <View key={index} style={styles.skillTag}>
                <Text style={styles.skillText}>{skill}</Text>
              </View>
            ))}
            {member.skills.length > 4 && (
              <Text style={styles.moreSkills}>
                +{member.skills.length - 4} more
              </Text>
            )}
          </View>
        </View>
      )}
      <View style={styles.memberBioDeleteContainer}>
      <Text 
            style={[styles.memberBio, !member.bio && styles.bioNotUpdated]} 
            numberOfLines={2}
          >
            {member.bio || 'Bio Not Updated'}
          </Text>

      {/* --- Remove Button (Updated) --- */}
        {canCreateProjects(userRole) && (
          <TouchableOpacity
            style={[
              styles.removeButton,
              removingMember === member.id && styles.removeButtonDisabled
            ]}
            onPress={() => handleRemoveMember(member)}
            disabled={removingMember === member.id}
          >
            {removingMember === member.id ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              // Use 'trash' for solid icon, not 'trash-o'
              <FontAwesome name="trash-o" size={24} color="#EF4444" />
            )}
          </TouchableOpacity>
        )}
        </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading project details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!project) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Project not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
  <SafeAreaView style={styles.container}>
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Project Details Card */}
      <View style={styles.projectCard}>
        <View style={styles.projectHeader}>
          <View style={styles.projectInfo}>
            <Text style={styles.projectName}>{project.name}</Text>
            <Text style={styles.projectDescription}>
              {project.description || 'No description available'}
            </Text>
          </View>
          <View
            style={[styles.statusBadge, { backgroundColor: getStatusColor(project.status) }]}
          >
            <Text style={styles.statusText}>{getStatusText(project.status)}</Text>
          </View>
        </View>

        <View style={styles.projectMeta}>
          <Text style={styles.metaText}>👥 {project.member_count || 0} members</Text>
          <Text style={styles.metaText}>
            📅 Created {new Date(project.created_at).toLocaleDateString()}
          </Text>
          {project.created_by_name && (
            <Text style={styles.metaText}>👤 Created by {project.created_by_name}</Text>
          )}
        </View>

        {project.required_skills && project.required_skills.length > 0 && (
          <View style={styles.skillsContainer}>
            <Text style={styles.skillsLabel}>Required Skills:</Text>
            <View style={styles.skillsWrapper}>
              {project.required_skills.map((skill, index) => (
                <View key={index} style={styles.requiredSkillTag}>
                  <Text style={styles.requiredSkillText}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Project Members Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Project Members</Text>
          {loadingMembers && <ActivityIndicator size="small" color="#6366f1" />}
        </View>

        {members.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No Members Yet</Text>
            <Text style={styles.emptyStateText}>
              {canCreateProjects(userRole)
                ? 'Add members to get started with this project'
                : 'No members have been added to this project yet'}
            </Text>
          </View>
        ) : (
          <View style={styles.membersList}>
            {members.map(renderMember)}
          </View>
        )}

        {/* Add Members Button Below Members List */}
        {canCreateProjects(userRole) && (
          <TouchableOpacity
            style={[styles.manageButton, { marginTop: 16 }]}
            onPress={() => navigation.navigate('ProjectSuggestions', { projectId })}
          >
            <Text style={styles.manageButtonText}>Add Members</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>

    {/* Remove Member Modal (unchanged) */}
    <Modal
      visible={showRemoveModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowRemoveModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Remove Member</Text>
          <Text style={styles.modalMessage}>
            Are you sure you want to remove {memberToRemove?.full_name} from this project?
          </Text>
          
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowRemoveModal(false)}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.modalConfirmButton}
              onPress={confirmRemoveMember}
            >
              <Text style={styles.modalConfirmButtonText}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  </SafeAreaView>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f111a', // very dark background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bioNotUpdated: {
    fontStyle: 'italic',
    color: '#9CA3AF', // A muted gray for the placeholder text
  },
  memberBioDeleteContainer: {
    flexDirection: 'row',          // Lays items out horizontally
    justifyContent: 'space-between', // Pushes bio to start, button to end
    alignItems: 'center',          // Vertically aligns text and icon
    marginTop: 8,                  // Adds some space above this section
  },
  loadingText: {
    marginTop: 12,
    color: '#e0e0e0',
    fontSize: 16,
  },
  errorText: {
    fontSize: 18,
    color: '#ff5c5c', // soft red
    marginBottom: 16,
  },
  scrollContent: {
    padding: 20,
  },
  projectCard: {
    backgroundColor: '#1c1f33', // dark card
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 20,
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
    fontSize: 24,
    fontWeight: '700',
    color: '#f0f0f0',
    marginBottom: 6,
  },
  projectDescription: {
    fontSize: 16,
    color: '#cfd3e0',
    lineHeight: 22,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  projectMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  metaText: {
    fontSize: 14,
    color: '#a8b0cc', // soft gray-blue
  },
  skillsContainer: {
    marginTop: 8,
  },
  skillsLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f0f0f0',
    marginBottom: 8,
  },
  skillsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  requiredSkillTag: {
    backgroundColor: '#292e49', // dark accent
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#6366f1', // soft blue accent
  },
  requiredSkillText: {
    color: '#dbe2ff',
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f0f0f0',
  },
  membersList: {
    gap: 12,
  },
  memberCard: {
    backgroundColor: '#1c1f33',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f0f0f0',
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 14,
    color: '#6366f1', // soft neo-blue
    fontWeight: '600',
    marginBottom: 2,
  },
  memberDepartment: {
    fontSize: 12,
    color: '#a8b0cc',
  },
  memberStatus: {
    alignItems: 'flex-end',
    gap: 8,
  },
  availabilityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  availabilityText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  removeButton: {
    alignSelf: 'flex-end',
    padding: 4
  },
  removeButtonDisabled: {
    opacity: 0.5,
  },
  removeButtonText: {
    color: '#ff5c5c',
    fontSize: 12,
    fontWeight: '600',
  },
  memberSkills: {
    marginBottom: 8,
  },
  skillTag: {
    backgroundColor: '#292e49',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  skillText: {
    color: '#dbe2ff',
    fontSize: 11,
    fontWeight: '500',
  },
  moreSkills: {
    color: '#9ca3af',
    fontSize: 11,
    fontStyle: 'italic',
  },
  memberBio: {
    fontSize: 13,
    color: '#cfd3e0',
    fontStyle: 'italic',
  },
  emptyState: {
    backgroundColor: '#1c1f33',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f0f0f0',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#a8b0cc',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1c1f33',
    borderRadius: 12,
    padding: 24,
    margin: 20,
    minWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f0f0f0',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 14,
    color: '#a8b0cc',
    lineHeight: 20,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  modalCancelButtonText: {
    color: '#6366f1',
    fontWeight: '600',
  },
  modalConfirmButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#ff5c5c',
  },
  modalConfirmButtonText: {
    color: 'white',
    fontWeight: '700',
  },
  manageButton: {
    backgroundColor: '#6366f1', // neo-blue
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-end',
  },
  manageButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 14,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '700',
  },
  availabilityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    // The background color will be set dynamically in the JSX
  }
});
