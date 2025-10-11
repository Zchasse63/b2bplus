import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { testUtil } from '@b2b-plus/shared';
import { Button } from '@b2b-plus/ui';

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>B2B+ Platform</Text>
      <Text style={styles.subtitle}>
        Food Service Disposables Ordering with Container Optimization
      </Text>
      <View style={styles.card}>
        <Text style={styles.label}>Monorepo Status:</Text>
        <Text style={styles.status}>{testUtil()}</Text>
      </View>
      <Button title="Get Started" onPress={() => console.log('Pressed!')} />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4ff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 30,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 5,
  },
  status: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: '600',
  },
});

