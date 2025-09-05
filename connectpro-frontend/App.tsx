import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';

// Screens
import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';
import CompanySetupScreen from './screens/CompanySetupScreen';
import ProfileSetupScreen from './screens/ProfileSetupScreen';
import HomeScreen from './screens/HomeScreen';
import ProfileScreen from './screens/ProfileScreen';
import SearchScreen from './screens/SearchScreen';
import ConnectionsScreen from './screens/ConnectionsScreen';
import UserProfileScreen from './screens/UserProfileScreen';
import ProjectDetailsScreen from './screens/ProjectDetailsScreen';
import ProjectsListScreen from './screens/ProjectsListScreen';
import ProjectSuggestionsScreen from './screens/ProjectSuggestionsScreen';
import CreateProjectScreen from './screens/CreateProjectScreen';
import MoodLoggingScreen from './screens/MoodLoggingScreen';
import MoraleOverviewScreen from './screens/MoraleViewDashboard';

export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  CompanySetup: { email: string };
  ProfileSetup: { email: string };
  Home: undefined;
  Profile: undefined;
  Search: undefined;
  Connections: undefined;
  UserProfile: { userId: string };
  CreateProject: undefined;
  ProjectSuggestions: { projectId: string };
  ProjectsList: undefined;
  ProjectDetails: { projectId: string };
  MoodLogging: undefined;
  MoraleOverview: { companyId: string};
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (loading) {
    return null; // or a loading spinner
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator
        initialRouteName={session?.user ? 'Home' : 'Login'}
        screenOptions={{
        headerStyle: {
          backgroundColor: '#0f172a',
        },
        headerTintColor: '#a3e635',
        headerTitleStyle: {
          fontWeight: 'bold',
          color: '#f9fafb',
          fontSize: 20,
        },
        headerLargeTitle: true, // 👈 makes it taller on iOS
      }}
      >

        {/* Authentication / Setup screens */}
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="SignUp" component={SignUpScreen} options={{ title: 'Sign Up' }} />
        <Stack.Screen name="CompanySetup" component={CompanySetupScreen} options={{ title: 'Company Setup' }} />
        <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} options={{ title: 'Profile Setup' }} />

        {/* Main app screens */}
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'ConnectPro' }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'My Profile' }} />
        <Stack.Screen name="Search" component={SearchScreen} options={{ title: 'Find People' }} />
        <Stack.Screen name="Connections" component={ConnectionsScreen} options={{ title: 'Connections' }} />
        <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: 'Profile' }} />
        <Stack.Screen name="CreateProject" component={CreateProjectScreen} options={{ title: 'Create Project' }} />
        <Stack.Screen name="ProjectSuggestions" component={ProjectSuggestionsScreen} options={{ title: 'Project Suggestions' }} />
        <Stack.Screen name="ProjectsList" component={ProjectsListScreen} options={{ title: 'Projects' }} />
        <Stack.Screen name="ProjectDetails" component={ProjectDetailsScreen} options={{ title: 'Project Details' }} />
        <Stack.Screen name="MoodLogging" component={MoodLoggingScreen} options={{ title: 'Log Your Mood' }} />
        <Stack.Screen name="MoraleOverview" component={MoraleOverviewScreen} options={{ title: 'Morale Overview' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
