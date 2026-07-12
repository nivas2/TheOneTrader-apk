import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';

const API_BASE = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/api\/v1$/, '');

export default function ReviewsScreen() {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [myReviews, setMyReviews] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscriber, setIsSubscriber] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    api.get('/client/subscriptions/mine').then((res) => {
      const subs = res.data.data || [];
      const hasActive = subs.some((s: any) => s.status === 'ACTIVE' || s.status === 'EXPIRED' || s.status === 'PENDING_ACTIVATION');
      setIsSubscriber(hasActive);
    }).catch(() => setIsSubscriber(false));

    api.get('/client/reviews/mine').then((res) => setMyReviews(res.data.data || [])).catch(() => {});
  }, []);

  const pickImages = async () => {
    if (images.length >= 3) {
      Alert.alert('Limit', 'Maximum 3 images allowed');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 3 - images.length,
    });
    if (!result.canceled) {
      setImages((prev) => [...prev, ...result.assets].slice(0, 3));
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

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
      const formData = new FormData();
      formData.append('rating', String(rating));
      formData.append('comment', comment);
      images.forEach((img, i) => {
        const uri = img.uri;
        const filename = uri.split('/').pop() || `image_${i}.jpg`;
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        formData.append('images', { uri, name: filename, type } as any);
      });

      const res = await api.post('/client/reviews', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMyReviews([res.data.data, ...myReviews]);
      setRating(0);
      setComment('');
      setImages([]);
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
          maxLength={500}
        />

        {/* Image Upload */}
        <TouchableOpacity style={styles.imagePickerButton} onPress={pickImages}>
          <Text style={styles.imagePickerText}>
            📷 Upload Profit Screenshots ({images.length}/3)
          </Text>
        </TouchableOpacity>
        {images.length > 0 && (
          <View style={styles.imagePreviewRow}>
            {images.map((img, i) => (
              <View key={i} style={styles.imagePreviewContainer}>
                <Image source={{ uri: img.uri }} style={styles.imagePreview} />
                <TouchableOpacity style={styles.imageRemoveButton} onPress={() => removeImage(i)}>
                  <Text style={styles.imageRemoveText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

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
            {item.images?.length > 0 && (
              <View style={styles.reviewImagesRow}>
                {item.images.map((img: string, i: number) => (
                  <Image key={i} source={{ uri: `${API_BASE}${img}` }} style={styles.reviewImage} />
                ))}
              </View>
            )}
            <Text style={styles.reviewDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
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
  imagePickerButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  imagePickerText: { fontSize: 13, color: '#6B7280' },
  imagePreviewRow: { flexDirection: 'row', gap: 8 },
  imagePreviewContainer: { position: 'relative' },
  imagePreview: { width: 64, height: 64, borderRadius: 6, borderWidth: 1, borderColor: '#E5E7EB' },
  imageRemoveButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageRemoveText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
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
  reviewImagesRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  reviewImage: { width: 72, height: 72, borderRadius: 6, borderWidth: 1, borderColor: '#E5E7EB' },
  reviewDate: { fontSize: 11, color: '#9CA3AF', marginTop: 8 },
});
