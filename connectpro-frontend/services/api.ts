import { API_BASE_URL } from '../lib/supabase';
import { MoodEntry, MoodScore, AggregatedMood } from '../types/mood';
import { Chat, ChatMessage } from '../types/chat';

export interface Company {
  id: string;
  name: string;
  domain: string;
  created_at: string;
}

export interface Profile {
  id: string;
  company_id: string;
  full_name: string;
  email: string;
  role?: string;
  department?: string;
  bio?: string;
  skills: string[];
  availability_status: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Connection {
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

export interface Project {
  id: string;
  name: string;
  description?: string;
  required_skills: string[];
  company_id: string;
  created_by: string;
  status: 'planning' | 'active' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface ProjectWithMembers extends Project {
  member_count?: number;
  created_by_name?: string;
}

export interface SkillMatch {
  profile_id: string;
  name: string;
  role: string;
  matching_skills: string[];
  skill_match_percentage: number;
}

class ApiService {
  private async makeRequest(
    endpoint: string,
    options: RequestInit = {},
    token?: string
  ): Promise<any> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers
            ? Object.fromEntries(new Headers(options.headers).entries())
            : {}),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMsg = 'An error occurred';
      try {
          const error = await response.json();
          errorMsg = error.detail || error.message || JSON.stringify(error);
      } catch {
          // Fallback in case backend sends plain text
          errorMsg = await response.text();
      }
      const error: any = new Error(errorMsg);
      error.status = response.status;
      error.detail = error.detail || errorMsg;
      throw error;
    }

    return response.json();
  }

  // Company methods
  async createCompany(name: string, domain: string): Promise<{ company: Company }> {
    return this.makeRequest('/companies', {
      method: 'POST',
      body: JSON.stringify({ name, domain }),
    });
  }

  async getCompanyByDomain(domain: string): Promise<Company> {
    return this.makeRequest(`/companies/by-domain/${domain}`);
  }

  // Profile methods
  async createProfile(
    profileData: {
      full_name: string;
      email: string;
      role?: string;
      department?: string;
      bio?: string;
      skills?: string[];
    },
    token: string
  ): Promise<{ profile: Profile }> {
    return this.makeRequest('/profiles', {
      method: 'POST',
      body: JSON.stringify(profileData),
    }, token);
  }

  async getMyProfile(token: string): Promise<Profile> {
    return this.makeRequest('/profiles/me', {}, token);
  }

  async updateMyProfile(
    profileData: {
      full_name?: string;
      role?: string;
      department?: string;
      bio?: string;
      skills?: string[];
      availability_status?: string;
    },
    token: string
  ): Promise<{ profile: Profile }> {
    return this.makeRequest('/profiles/me', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    }, token);
  }

  async searchProfiles(query: string, token: string): Promise<Profile[]> {
    const params = query ? `?q=${encodeURIComponent(query)}` : '';
    return this.makeRequest(`/profiles${params}`, {}, token);
  }

  async getProfile(profileId: string, token: string): Promise<Profile> {
    return this.makeRequest(`/profiles/${profileId}`, {}, token);
  }

  // Connection methods
  async createConnectionRequest(
    targetId: string,
    message: string,
    token: string
  ): Promise<{ connection: Connection }> {
    return this.makeRequest('/connections', {
      method: 'POST',
      body: JSON.stringify({ target_id: targetId, message }),
    }, token);
  }

  async getMyConnections(token: string): Promise<{
  sent: ConnectionWithProfile[];
  received: ConnectionWithProfile[];
}> {
  return this.makeRequest('/connections', {}, token);
}

  async updateConnection(
    connectionId: string,
    status: 'accepted' | 'declined',
    token: string
  ): Promise<{ connection: Connection }> {
    return this.makeRequest(`/connections/${connectionId}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }, token);
  }
  async createProject(
    projectData: {
      name: string;
      description?: string;
      required_skills: string[];
      company_id: string;
    },
    token: string
  ): Promise<{ project: Project }> {
    return this.makeRequest('/projects', {
      method: 'POST',
      body: JSON.stringify(projectData),
    }, token);
  }

  async getUserCompanyId(token: string): Promise<string | null> {
    try {
      const profile = await this.getMyProfile(token);
      return profile.company_id;
    } catch (error) {
      console.error('Error getting user company ID:', error);
      throw new Error('Failed to get user company ID');
    }
  }

  async getProjectSuggestions(
    projectId: string,
    token: string
  ): Promise<SkillMatch[]> {
    return this.makeRequest(`/projects/${projectId}/suggested-members`, {}, token);
  }

  async getSkillsDashboard(
    companyId: string,
    token: string
  ): Promise<{
    total_skills: Record<string, number>;
    skills_by_role: Record<string, Record<string, number>>;
    total_employees: number;
  }> {
    return this.makeRequest(`/companies/${companyId}/skills-dashboard`, {}, token);
  }

  async addProjectMember(
    projectId: string,
    profileId: string,
    token: string
  ): Promise<{ success: boolean; message: string }> {
    return this.makeRequest(`/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify({ profile_id: profileId }),
    }, token);
  }

  async getCompanyProjects(token: string): Promise<ProjectWithMembers[]> {
    return this.makeRequest('/projects/company', {}, token);
  }

  async removeProjectMember(
    projectId: string,
    profileId: string,
    token: string
  ): Promise<{ success: boolean; message: string }> {
    return this.makeRequest(`/projects/${projectId}/members/${profileId}`, {
      method: 'DELETE',
    }, token);
  }

  async getProjectMembers(
    projectId: string,
    token: string
  ): Promise<Profile[]> {
    return this.makeRequest(`/projects/${projectId}/members`, {}, token);
  }

  // ------------------------
  // Morale / Mood methods
  // ------------------------
  async logMood(mood_score: MoodScore, note?: string, project_id?: string, token?: string): Promise<MoodEntry> {
    return this.makeRequest(
      '/mood',
      {
        method: 'POST',
        body: JSON.stringify({ mood_score, note, project_id }),
      },
        token
      );
    }

    async getCompanyMood(company_id: string, range: 'daily' | 'weekly' = 'weekly', token: string): Promise<AggregatedMood[]> {
      return this.makeRequest(
        `/mood/company/${company_id}?range=${range}`,
        {},
        token
      );
    }

    async getProjectMood(project_id: string, range: 'daily' | 'weekly' = 'weekly', token: string): Promise<AggregatedMood[]> {
      return this.makeRequest(
        `/mood/project/${project_id}?range=${range}`,
        {},
        token
      );
    }
    async getUserChats(token: string): Promise<Chat[]> {
      return this.makeRequest('/chats', {}, token);
    }

    async getOrCreateChat(recipientId: string, token: string): Promise<Chat> {
      return this.makeRequest('/chats/with-user', {
        method: 'POST',
        body: JSON.stringify({ recipient_id: recipientId }),
      }, token);
    }

    async getChatMessages(chatId: string, token: string): Promise<ChatMessage[]> {
      return this.makeRequest(`/chats/${chatId}/messages`, {}, token);
    }

    async sendMessage(
      chatId: string, 
      content: string, 
      token: string
    ): Promise<ChatMessage> {
      return this.makeRequest(`/chats/${chatId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      }, token);
    }

    async markMessagesAsRead(chatId: string, token: string): Promise<void> {
      return this.makeRequest(`/chats/${chatId}/read`, {
        method: 'PUT',
      }, token);
    }
}

export const apiService = new ApiService();