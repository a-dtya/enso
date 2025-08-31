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
  'Engineering Manager'
];

export const canCreateProjects = (userRole: string): boolean => {
  return PROJECT_MANAGER_ROLES.includes(userRole);
};