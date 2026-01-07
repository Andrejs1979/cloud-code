import React, { useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable, Modal, StyleSheet } from 'react-native';
import { useAppStore } from '../lib/useStore';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { StatusDot } from '../../components/StatusDot';
import { Input } from '../../components/Input';
import { formatTime } from '../lib/utils';
import { colors } from '../lib/styles';
import { Ionicons } from '@expo/vector-icons';

const styles = StyleSheet.create({
  flex1: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.foreground,
  },
  content: { padding: 16 },
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    width: 56,
    height: 56,
    backgroundColor: colors.brand,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.foreground,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sessionRow: {
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    color: colors.foreground,
  },
  promptText: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  timeText: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  terminalOutput: {
    backgroundColor: colors.muted,
    borderRadius: 8,
    padding: 12,
    minHeight: 200,
    maxHeight: 300,
  },
  cancelText: {
    color: colors.error,
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.foreground,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: 24,
  },
});

export default function SessionsScreen() {
  const { sessions, currentSession, isLoading, refresh, setCurrentSession, clearCurrentSession } = useAppStore();

  const [modalVisible, setModalVisible] = React.useState(false);
  const [prompt, setPrompt] = React.useState('');
  const [repository, setRepository] = React.useState('');

  useEffect(() => {
    refresh();
  }, []);

  return (
    <View style={styles.flex1}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor="#6366f1" />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Interactive Sessions</Text>
        </View>

        <View style={styles.content}>
          {/* Active Session */}
          {currentSession && (
            <Card title="Active Session">
              <View style={[styles.row, styles.justifyBetween, { marginBottom: 12 }]}>
                <View style={styles.row}>
                  <StatusDot status="running" />
                  <Text style={styles.statusText}>Processing...</Text>
                </View>
                <Pressable onPress={clearCurrentSession}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
              </View>
              <View style={styles.terminalOutput}>
                <ScrollView>
                  {currentSession.output.map((line, i) => (
                    <Text key={i} style={{ fontSize: 12, color: colors.foreground, fontFamily: 'monospace' }}>
                      {line}
                    </Text>
                  ))}
                </ScrollView>
              </View>
            </Card>
          )}

          {/* Sessions List */}
          {!sessions.length ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={48} color="#71717a" />
              <Text style={styles.emptyText}>No sessions yet</Text>
              <Text style={styles.emptySubtext}>Start a new interactive session with Claude Code</Text>
              <Button label="Start New Session" onPress={() => setModalVisible(true)} />
            </View>
          ) : (
            <Card title="Session History">
              {sessions.map((session) => (
                <View key={session.id} style={styles.sessionRow}>
                  <View style={styles.row}>
                    <StatusDot status={session.status as any} />
                    <Text style={styles.statusText}>Session #{session.id.slice(0, 8)}</Text>
                  </View>
                  <Text style={styles.promptText}>{session.prompt}</Text>
                  {session.repository && (
                    <View style={styles.row}>
                      <Ionicons name="logo-github" size={14} color="#71717a" />
                      <Text style={styles.timeText}>{session.repository}</Text>
                    </View>
                  )}
                </View>
              ))}
            </Card>
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <Pressable style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={24} color="white" />
      </Pressable>

      {/* New Session Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Session</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#71717a" />
              </Pressable>
            </View>

            <Input
              label="Prompt"
              placeholder="e.g., Analyze this repository for security issues"
              value={prompt}
              onChangeText={setPrompt}
            />

            <Input
              label="Repository (optional)"
              placeholder="owner/repo"
              value={repository}
              onChangeText={setRepository}
            />

            <Button
              label="Start Session"
              onPress={async () => {
                if (!prompt.trim()) return;
                setModalVisible(false);
                setCurrentSession({
                  id: Date.now().toString(),
                  prompt,
                  output: [],
                  status: 'starting',
                });
              }}
              style={{ marginTop: 16 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
