import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Dimensions
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { apiService } from '../services/api';
import { LineChart } from 'react-native-chart-kit';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'MoraleOverview'>;

interface MoodEntry {
  date: string;
  avg_mood: number;
}

const screenWidth = Dimensions.get('window').width - 32; // padding adjustment

export default function MoraleOverviewScreen({ route }: Props) {
  const { companyId } = route.params;
  const [loading, setLoading] = useState(true);
  const [moodData, setMoodData] = useState<MoodEntry[]>([]);
  const [range, setRange] = useState<'daily' | 'weekly'>('weekly');

  useEffect(() => {
    fetchMorale();
  }, [range]);

  const fetchMorale = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      
      const data = await apiService.getCompanyMood(companyId, range, session.access_token);
      setMoodData(data);
    } catch (error) {
      console.error('Failed to fetch morale data', error);
    } finally {
      setLoading(false);
    }
  };

  const labels = moodData.map(entry => entry.date);
  const values = moodData.map(entry => entry.avg_mood);
  const avgMood = values.length ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2) : '-';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Company Morale Overview</Text>

      {/* Range selector */}
      <View style={styles.rangeSelector}>
        {['daily', 'weekly'].map(r => (
          <TouchableOpacity
            key={r}
            style={[styles.rangeButton, range === r && styles.rangeSelected]}
            onPress={() => setRange(r as 'daily' | 'weekly')}
          >
            <Text style={range === r ? styles.rangeTextSelected : styles.rangeText}>
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 50 }} />
      ) : (
        <>
          <LineChart
            data={{
              labels,
              datasets: [{ data: values }],
            }}
            width={screenWidth}
            height={220}
            yAxisSuffix="😃"
            chartConfig={{
              backgroundColor: '#f8fafc',
              backgroundGradientFrom: '#f8fafc',
              backgroundGradientTo: '#f8fafc',
              decimalPlaces: 2,
              color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
              labelColor: () => '#333',
              style: { borderRadius: 16 },
              propsForDots: { r: '6', strokeWidth: '2', stroke: '#6366f1' },
            }}
            bezier
            style={{ marginVertical: 16, borderRadius: 16 }}
          />

          {/* Stats cards */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statTitle}>Average Mood</Text>
              <Text style={styles.statValue}>{avgMood}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statTitle}>Entries</Text>
              <Text style={styles.statValue}>{values.length}</Text>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, flexGrow: 1, backgroundColor: '#f8fafc' },
  header: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  rangeSelector: { flexDirection: 'row', marginBottom: 16 },
  rangeButton: {
    flex: 1,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  rangeSelected: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  rangeText: { color: '#333' },
  rangeTextSelected: { color: '#fff', fontWeight: '600' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  statCard: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f0f8ff',
    borderRadius: 12,
    marginRight: 8,
    alignItems: 'center',
  },
  statTitle: { fontSize: 14, color: '#555' },
  statValue: { fontSize: 20, fontWeight: '700', marginTop: 4 },
});
