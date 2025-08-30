import { API_BASE_URL } from '../lib/supabase';

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
    throw new Error(errorMsg);
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
}

export const apiService = new ApiService();