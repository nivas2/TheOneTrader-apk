import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import api from '../services/api';
import SignalCard from '../components/SignalCard';

export default function HistoryScreen() {
  const [signals, setSignals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  const displayDate = (date: Date) => date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const fetchHistory = async (pageNum: number, append = false) => {
    try {
      let url = `/signals/history?page=${pageNum}&limit=15`;
      if (startDate) url += `&startDate=${formatDate(startDate)}`;
      if (endDate) url += `&endDate=${formatDate(endDate)}`;
      const res = await api.get(url);
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

  const handleFilter = () => {
    setPage(1);
    setIsLoading(true);
    fetchHistory(1);
  };

  const handleClear = () => {
    setStartDate(null);
    setEndDate(null);
    setPage(1);
    setIsLoading(true);
    // Fetch without dates
    (async () => {
      try {
        const res = await api.get('/signals/history?page=1&limit=15');
        const data = res.data.data || [];
        setSignals(data);
        setHasMore(1 < (res.data.pagination?.totalPages || 1));
      } catch {}
      finally { setIsLoading(false); }
    })();
  };

  const onStartChange = (_event: DateTimePickerEvent, date?: Date) => {
    setShowStartPicker(false);
    if (date) setStartDate(date);
  };

  const onEndChange = (_event: DateTimePickerEvent, date?: Date) => {
    setShowEndPicker(false);
    if (date) setEndDate(date);
  };

  if (isLoading && signals.length === 0) {
    return (
      <View style={styles.center}>
        <Text>Loading history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Date Filter */}
      <View style={styles.filterRow}>
        <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartPicker(true)}>
          <Text style={styles.dateLabel}>From</Text>
          <Text style={styles.dateValue}>{startDate ? displayDate(startDate) : 'All'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndPicker(true)}>
          <Text style={styles.dateLabel}>To</Text>
          <Text style={styles.dateValue}>{endDate ? displayDate(endDate) : 'All'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.filterButton} onPress={handleFilter}>
          <Text style={styles.filterButtonText}>Filter</Text>
        </TouchableOpacity>

        {(startDate || endDate) && (
          <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {showStartPicker && (
        <DateTimePicker
          value={startDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onStartChange}
          maximumDate={endDate || new Date()}
        />
      )}
      {showEndPicker && (
        <DateTimePicker
          value={endDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onEndChange}
          minimumDate={startDate || undefined}
          maximumDate={new Date()}
        />
      )}

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
            <Text style={styles.emptyText}>No completed signals found.</Text>
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
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 8,
    flexWrap: 'wrap',
  },
  dateButton: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 100,
  },
  dateLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 2 },
  dateValue: { fontSize: 13, color: '#1F2937', fontWeight: '500' },
  filterButton: {
    backgroundColor: '#00B090',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  filterButtonText: { color: '#FFF', fontWeight: '600', fontSize: 13 },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  clearButtonText: { color: '#EF4444', fontWeight: '500', fontSize: 13 },
});
