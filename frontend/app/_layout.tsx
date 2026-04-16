import { Stack } from 'expo-router';
import { AuthProvider } from '../src/context/AuthContext';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#17110C' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="org-select" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="assets-list" />
        <Stack.Screen name="tasks" />
        <Stack.Screen name="audit" />
        <Stack.Screen name="roles" />
        <Stack.Screen name="premium" />
        <Stack.Screen name="analytics" />
      </Stack>
    </AuthProvider>
  );
}
