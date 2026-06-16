import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import api from '../services/api';
import SignalCard from '../components/SignalCard';

export default function HistoryScreen() {
  const [signals, setSignals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchHistory = async (pageNum: number, append = false) => {
    try {
      const res = await api.get(`/signals/history?page=${pageNum}&limit=15`);
      const data = res.data.data || [];
      setSignals(append ? (prev) => [...prev, ...data] : data);
      setHasMore(pageNum < (res.data.pagination?.totalPages || 1));
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory(1);
  }, []);

  const onRefresh = () => {
    setIsRefreshing(true);
    setPage(1);
    fetchHistory(1);
  };

  const loadMore = () => {
    if (!hasMore || isLoading) return;
    const next = page + 1;
    setPage(next);
    fetchHistory(next, true);
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Text>Loading history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={signals}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <SignalCard signal={item} />}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#00B090" />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No completed signals yet.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: '#4B5563' },
});
