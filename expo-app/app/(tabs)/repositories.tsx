import { useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useAppStore } from '../lib/useStore';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { StatusDot } from '../../components/StatusDot';
import { Button } from '../../components/Button';
import { colors } from '../lib/styles';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';

const styles = StyleSheet.create({
  flex1: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.foreground,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  textMuted: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  textXsMuted: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  repoCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  repoHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  repoName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground,
    flex: 1,
  },
  repoOwner: {
    fontSize: 13,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  repoDescription: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginTop: 8,
    lineHeight: 20,
  },
  repoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.secondary,
  },
  linkButtonText: {
    fontSize: 13,
    color: colors.secondaryForeground,
    fontWeight: '500',
  },
});

export default function RepositoriesScreen() {
  const { repositories, status, isLoading, refresh } = useAppStore();

  useEffect(() => {
    refresh();
  }, []);

  const isGitHubConfigured = status?.configured || status?.githubAppConfigured;

  const openGitHubSettings = async () => {
    if (typeof window !== 'undefined') {
      window.open('https://github.com/settings/apps', '_blank');
    } else {
      await WebBrowser.openAuthSessionAsync('https://github.com/settings/apps');
    }
  };

  const openRepository = (fullName: string) => {
    const url = `https://github.com/${fullName}`;
    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    } else {
      WebBrowser.openBrowserAsync(url);
    }
  };

  // If GitHub is not configured
  if (!isGitHubConfigured) {
    return (
      <ScrollView style={styles.flex1}>
        <View style={styles.header}>
          <Text style={styles.title}>Repositories</Text>
        </View>

        <View style={styles.emptyState}>
          <Ionicons name="git-network" size={48} color="#71717a" style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>GitHub Not Connected</Text>
          <Text style={styles.emptyText}>
            Connect your GitHub App to view and manage connected repositories.
          </Text>
          <Button
            label="Connect GitHub App"
            icon={<Ionicons name="logo-github" size={18} color="currentColor" />}
            variant="primary"
            onPress={openGitHubSettings}
          />
        </View>
      </ScrollView>
    );
  }

  // Loading state
  if (isLoading && repositories.length === 0) {
    return (
      <View style={styles.flex1}>
        <View style={styles.header}>
          <Text style={styles.title}>Repositories</Text>
        </View>
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      </View>
    );
  }

  // Empty state
  if (repositories.length === 0) {
    return (
      <ScrollView style={styles.flex1}>
        <View style={styles.header}>
          <Text style={styles.title}>Repositories</Text>
        </View>

        <View style={styles.emptyState}>
          <Ionicons name="library" size={48} color="#71717a" style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>No Repositories Connected</Text>
          <Text style={styles.emptyText}>
            Add repositories to your GitHub App installation to start processing issues.
          </Text>
          <Button
            label="Manage Repositories on GitHub"
            icon={<Ionicons name="logo-github" size={18} color="currentColor" />}
            variant="outline"
            onPress={openGitHubSettings}
          />
        </View>
      </ScrollView>
    );
  }

  // List of repositories
  return (
    <ScrollView style={styles.flex1}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Repositories</Text>
          <Pressable onPress={refresh} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
            <Ionicons name="refresh" size={20} color="#71717a" />
          </Pressable>
        </View>
      </View>

      <View style={styles.content}>
        {/* Info card */}
        <Card>
          <View style={styles.row}>
            <Ionicons name="information-circle" size={18} color="#6366f1" />
            <Text style={styles.textMuted}>
              These repositories are connected to your GitHub App installation. Manage them via GitHub settings.
            </Text>
          </View>
        </Card>

        {/* Repository list */}
        {repositories.map((repo) => (
          <Pressable
            key={repo.full_name}
            style={({ pressed }) => [styles.repoCard, { opacity: pressed ? 0.8 : 1 }]}
            onPress={() => openRepository(repo.full_name)}
          >
            <View style={styles.repoHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.repoName}>{repo.name}</Text>
                <Text style={styles.repoOwner}>{repo.owner}</Text>
              </View>
              <Badge
                label={repo.private ? 'Private' : 'Public'}
                variant={repo.private ? 'warning' : 'secondary'}
              />
            </View>

            {repo.description && (
              <Text style={styles.repoDescription} numberOfLines={2}>
                {repo.description}
              </Text>
            )}

            <View style={styles.repoMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="git-branch" size={14} color="#71717a" />
                <Text style={styles.metaText}>{repo.default_branch}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="link" size={14} color="#71717a" />
                <Text style={styles.metaText}>View on GitHub</Text>
              </View>
            </View>
          </Pressable>
        ))}

        {/* Manage button */}
        <Button
          label="Manage Repositories on GitHub"
          icon={<Ionicons name="logo-github" size={18} color="currentColor" />}
          variant="outline"
          onPress={openGitHubSettings}
        />
      </View>
    </ScrollView>
  );
}
