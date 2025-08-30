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
          headerStyle: { backgroundColor: '#6366f1' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
