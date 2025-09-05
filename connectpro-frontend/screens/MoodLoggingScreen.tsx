import React, { useState, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator, ScrollView
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { apiService, ProjectWithMembers} from '../services/api';
import { supabase } from '../lib/supabase';
import { moodEmojis, MoodScore } from '../types/mood';
import { Picker } from '@react-native-picker/picker';

type Props = NativeStackScreenProps<RootStackParamList, 'MoodLogging'>;

export default function MoodLoggingScreen({ navigation }: Props) {
  const [selectedMood, setSelectedMood] = useState<MoodScore | null>(null);
  const [moodNote, setMoodNote] = useState<string | undefined>(undefined);
  const [loggingMood, setLoggingMood] = useState(false);
  const [companyProjects, setCompanyProjects] = useState<ProjectWithMembers[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);

  useEffect(() => {
    loadCompanyProjects();
  }, []);

  async function loadCompanyProjects() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const projects = await apiService.getCompanyProjects(session.access_token);
      setCompanyProjects(projects);
    } catch (error) {
      console.error('Failed to load projects', error);
    }
  }

  async function handleLogMood() {
    if (!selectedMood) return Alert.alert('Select your mood first');

    setLoggingMood(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      await apiService.logMood(
        selectedMood,
        moodNote || undefined,
        selectedProjectId,
        session.access_token
      );

      Alert.alert('Success', 'Your mood has been logged!');
      setSelectedMood(null);
      setMoodNote(undefined);
      setSelectedProjectId(undefined);

      navigation.goBack(); // go back to Home after logging
    } catch (error: any) {
      if (error.status === 400) {
        Alert.alert('Error', 'You have already logged your mood for today.');
      } else {
        Alert.alert('Error', error.message || 'Failed to log mood');
      }
    } finally {
      setLoggingMood(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>How are you feeling today?</Text>
      <View style={styles.moodRow}>
        {Object.entries(moodEmojis).map(([score, emoji]) => (
          <TouchableOpacity
            key={score}
            style={[
              styles.moodEmoji,
              selectedMood === Number(score) && styles.moodSelected
            ]}
            onPress={() => setSelectedMood(Number(score) as MoodScore)}
          >
            <Text style={styles.moodText}>{emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        style={styles.moodInput}
        placeholder="Add a note (optional)"
        value={moodNote}
        onChangeText={setMoodNote}
      />

      <View style={{ marginVertical: 12 }}>
        <Text style={{ marginBottom: 4, fontWeight: '600' }}>Tag a Project (optional)</Text>
        <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8 }}>
          <Picker
            selectedValue={selectedProjectId}
            onValueChange={(value) => setSelectedProjectId(value)}
          >
            <Picker.Item label="None" value={undefined} />
            {companyProjects.map((proj) => (
              <Picker.Item key={proj.id} label={proj.name} value={proj.id} />
            ))}
          </Picker>
        </View>
      </View>

      <TouchableOpacity
        style={styles.logMoodButton}
        onPress={handleLogMood}
        disabled={loggingMood}
      >
        {loggingMood ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.logMoodText}>Log Mood</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flexGrow: 1, backgroundColor: '#f8fafc' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  moodRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  moodEmoji: { padding: 12, borderRadius: 50, backgroundColor: '#fff' },
  moodSelected: { borderWidth: 2, borderColor: '#6366f1' },
  moodText: { fontSize: 28 },
  moodInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 12 },
  logMoodButton: { backgroundColor: '#6366f1', padding: 14, borderRadius: 8, alignItems: 'center' },
  logMoodText: { color: 'white', fontWeight: '600' },
});
