import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../services/api';

export default function ReviewsScreen() {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [myReviews, setMyReviews] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscriber, setIsSubscriber] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    api.get('/client/subscriptions/mine').then((res) => {
      const subs = res.data.data || [];
      const hasActive = subs.some((s: any) => s.status === 'ACTIVE' || s.status === 'PENDING_ACTIVATION');
      setIsSubscriber(hasActive);
    }).catch(() => setIsSubscriber(false));

    api.get('/client/reviews/mine').then((res) => setMyReviews(res.data.data || [])).catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }
    if (comment.length < 5) {
      Alert.alert('Error', 'Comment must be at least 5 characters');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await api.post('/client/reviews', { rating, comment });
      setMyReviews([res.data.data, ...myReviews]);
      setRating(0);
      setComment('');
      Alert.alert('Success', 'Review submitted for approval');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to submit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = () => (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity key={star} onPress={() => setRating(star)}>
          <Text style={[styles.star, star <= rating && styles.starActive]}>&#9733;</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (isSubscriber === null) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!isSubscriber) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.lockIcon}>&#128274;</Text>
        <Text style={styles.lockTitle}>Reviews Locked</Text>
        <Text style={styles.lockSubtitle}>Subscribe to a plan to write and view reviews</Text>
        <TouchableOpacity style={styles.subscribeButton} onPress={() => router.push('/(tabs)/payment' as any)}>
          <Text style={styles.subscribeText}>Subscribe Now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.formTitle}>Write a Review</Text>
        {renderStars()}
        <TextInput
          style={styles.textArea}
          placeholder="Share your experience..."
          placeholderTextColor="#9CA3AF"
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={isSubmitting}>
          <Text style={styles.buttonText}>{isSubmitting ? 'Submitting...' : 'Submit Review'}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={myReviews}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          myReviews.length > 0 ? <Text style={styles.sectionTitle}>My Reviews</Text> : null
        }
        renderItem={({ item }) => (
          <View style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <Text style={styles.reviewStars}>{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}</Text>
              <View style={[styles.statusBadge, {
                backgroundColor: item.status === 'APPROVED' ? '#D1FAE5' : item.status === 'REJECTED' ? '#FEE2E2' : '#FEF3C7',
              }]}>
                <Text style={[styles.statusText, {
                  color: item.status === 'APPROVED' ? '#065F46' : item.status === 'REJECTED' ? '#991B1B' : '#92400E',
                }]}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.reviewComment}>{item.comment}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  centerContainer: { flex: 1, backgroundColor: '#F8F9FA', justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { fontSize: 16, color: '#9CA3AF' },
  lockIcon: { fontSize: 48, marginBottom: 16 },
  lockTitle: { fontSize: 22, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  lockSubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
  subscribeButton: {
    backgroundColor: '#00B090',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  subscribeText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  form: { backgroundColor: '#FFF', padding: 16, margin: 16, borderRadius: 12, gap: 12 },
  formTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  stars: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  star: { fontSize: 32, color: '#D1D5DB' },
  starActive: { color: '#FBBF24' },
  textArea: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  button: {
    backgroundColor: '#00B090',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 12 },
  reviewCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewStars: { fontSize: 16, color: '#FBBF24' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: '600' },
  reviewComment: { fontSize: 13, color: '#4B5563', marginTop: 8 },
});
