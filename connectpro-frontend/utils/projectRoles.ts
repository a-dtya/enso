// utils/projectRoles.ts
export const PROJECT_MANAGER_ROLES = [
  'Manager',
  'Senior Manager', 
  'Team Lead',
  'Project Manager',
  'Director',
  'VP',
  'CEO',
  'CTO',
  'Head of Engineering',
  'Engineering Manager',
  'SWE'
];

// Only these roles can see dashboards
export const DASHBOARD_ROLES = [
  'Manager',
  'Senior Manager',
  'Team Lead',
  'Project Manager',
  'Director',
  'VP',
  'CEO',
  'CTO',
  'Head of Engineering',
  'Engineering Manager',
  'SWE'
];

// Check if user can create projects
export const canCreateProjects = (userRole: string): boolean => {
  return PROJECT_MANAGER_ROLES.map(r => r.toLowerCase()).includes(userRole.toLowerCase());
};

// Check if user can see dashboards
export const canViewDashboard = (userRole: string): boolean => {
  return DASHBOARD_ROLES.map(r => r.toLowerCase()).includes(userRole.toLowerCase());
};