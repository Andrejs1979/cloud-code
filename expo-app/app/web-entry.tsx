import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useAppStore } from '../lib/useStore';
import { colors } from '../lib/styles';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../components/Card';
import { StatusDot } from '../components/StatusDot';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { formatTime } from '../lib/utils';

// Screens
function DashboardScreen() {
  const { stats, tasks, sessions, isLoading, refresh } = useAppStore();

  React.useEffect(() => {
    refresh();
  }, []);

  return (
    <View style={styles.content}>
      <View style={styles.statsGrid}>
        {stats ? (
          <>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#6366f1' }]}>{stats.processedIssues ?? 0}</Text>
              <Text style={styles.statLabel}>Processed</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#22c55e' }]}>{Math.round(stats.successRate)}%</Text>
              <Text style={styles.statLabel}>Success Rate</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#eab308' }]}>{stats.activeSessions ?? 0}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#a1a1aa' }]}>{stats.totalIssues ?? 0}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
          </>
        ) : (
          <Text style={styles.loadingText}>Loading stats...</Text>
        )}
      </View>
    </View>
  );
}

function IssuesScreen() {
  const { issues, isLoading, refresh } = useAppStore();

  React.useEffect(() => {
    refresh();
  }, []);

  return (
    <View style={styles.content}>
      <Text style={styles.title}>GitHub Issues</Text>
      {!issues.length ? (
        <Text style={styles.emptyText}>No issues found</Text>
      ) : (
        issues.map((issue) => (
          <View key={issue.id ?? issue.number} style={styles.card}>
            <Text style={styles.cardTitle}>{issue.title}</Text>
            <Text style={styles.cardBody}>{issue.body ?? 'No description'}</Text>
            <Badge label={issue.state === 'open' ? 'Open' : 'Closed'} variant={issue.state === 'open' ? 'success' : 'secondary'} />
          </View>
        ))
      )}
    </View>
  );
}

function SessionsScreen() {
  const { sessions, isLoading, refresh } = useAppStore();

  React.useEffect(() => {
    refresh();
  }, []);

  return (
    <View style={styles.content}>
      <Text style={styles.title}>Interactive Sessions</Text>
      {!sessions.length ? (
        <Text style={styles.emptyText}>No sessions yet</Text>
      ) : (
        sessions.map((session) => (
          <View key={session.id} style={styles.card}>
            <View style={styles.row}>
              <StatusDot status={session.status as any} />
              <Text style={styles.cardTitle}>Session #{session.id.slice(0, 8)}</Text>
            </View>
            <Text style={styles.cardBody}>{session.prompt}</Text>
            <Text style={styles.timeText}>{formatTime(session.createdAt)}</Text>
          </View>
        ))
      )}
    </View>
  );
}

function SettingsScreen() {
  const { stats, status, isLoading, refresh } = useAppStore();

  React.useEffect(() => {
    refresh();
  }, []);

  return (
    <View style={styles.content}>
      <Text style={styles.title}>Settings</Text>
      <Card title="GitHub Configuration">
        <View style={styles.row}>
          <StatusDot status={status?.configured ? 'completed' : 'pending'} />
          <Text style={styles.statusText}>
            {status?.configured ? 'GitHub App Connected' : 'GitHub Not Connected'}
          </Text>
        </View>
        <Text style={styles.mutedText}>
          {status?.configured
            ? 'Your GitHub App is properly configured and connected.'
            : 'Install the GitHub App to enable automatic issue processing.'}
        </Text>
      </Card>
    </View>
  );
}

// Main App with Tab Navigation
export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sessions' | 'issues' | 'settings'>('dashboard');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.row}>
          <Ionicons name="cube" size={24} color="#6366f1" />
          <Text style={styles.headerTitle}>Claude Pipeline</Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollContent}>
        {activeTab === 'dashboard' && <DashboardScreen />}
        {activeTab === 'sessions' && <SessionsScreen />}
        {activeTab === 'issues' && <IssuesScreen />}
        {activeTab === 'settings' && <SettingsScreen />}
      </ScrollView>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TabButton icon="home" label="Pipeline" active={activeTab === 'dashboard'} onPress={() => setActiveTab('dashboard')} />
        <TabButton icon="chatbubbles" label="Chat" active={activeTab === 'sessions'} onPress={() => setActiveTab('sessions')} />
        <TabButton icon="git-branch" label="Issues" active={activeTab === 'issues'} onPress={() => setActiveTab('issues')} />
        <TabButton icon="settings" label="Settings" active={activeTab === 'settings'} onPress={() => setActiveTab('settings')} />
      </View>
    </View>
  );
}

function TabButton({ icon, label, active, onPress }: { icon: any; label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={styles.tabButton} onPress={onPress}>
      <Ionicons name={icon} size={20} color={active ? '#6366f1' : '#71717a'} />
      <Text style={[styles.tabLabel, { color: active ? '#6366f1' : '#71717a' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.foreground,
    marginLeft: 8,
  },
  scrollContent: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.foreground,
    marginBottom: 8,
  },
  cardBody: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    color: colors.foreground,
  },
  mutedText: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginTop: 8,
  },
  timeText: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  emptyText: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 4,
  },
});
