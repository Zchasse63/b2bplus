import { Stack } from 'expo-router';
import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'B2B+ Platform' }} />
        <Stack.Screen name="auth/login" options={{ title: 'Sign In', headerShown: false }} />
        <Stack.Screen name="auth/register" options={{ title: 'Sign Up', headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}

