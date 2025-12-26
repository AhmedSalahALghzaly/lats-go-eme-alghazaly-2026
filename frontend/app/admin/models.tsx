import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../src/hooks/useTheme';
import { useTranslation } from '../../src/hooks/useTranslation';
import { carBrandsApi, carModelsApi } from '../../src/services/api';
import { Header } from '../../src/components/Header';

export default function ModelsAdmin() {
  const { colors } = useTheme();
  const { language, isRTL } = useTranslation();
  const router = useRouter();

  const [brands, setBrands] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [modelImage, setModelImage] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [brandsRes, modelsRes] = await Promise.all([
        carBrandsApi.getAll(),
        carModelsApi.getAll(),
      ]);
      setBrands(brandsRes.data || []);
      setModels(modelsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setModelImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
        setImageUrl('');
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const handleSave = async () => {
    if (!selectedBrandId || !name.trim() || !nameAr.trim()) {
      setError(language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await carModelsApi.create({
        name: name.trim(),
        name_ar: nameAr.trim(),
        brand_id: selectedBrandId,
        year_start: yearFrom ? parseInt(yearFrom) : null,
        year_end: yearTo ? parseInt(yearTo) : null,
        image_url: modelImage || imageUrl.trim() || null,
      });

      setShowSuccess(true);
      setName('');
      setNameAr('');
      setYearFrom('');
      setYearTo('');
      setModelImage(null);
      setImageUrl('');
      fetchData();

      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Error saving model');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await carModelsApi.delete(id);
      fetchData();
    } catch (error) {
      console.error('Error deleting model:', error);
    }
  };

  const getBrandName = (brandId: string) => {
    const brand = brands.find(b => b.id === brandId);
    return language === 'ar' ? brand?.name_ar : brand?.name;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Header title={language === 'ar' ? 'الموديلات' : 'Models'} showBack showSearch={false} showCart={false} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* Breadcrumb */}
        <View style={[styles.breadcrumb, isRTL && styles.breadcrumbRTL]}>
          <TouchableOpacity onPress={() => router.push('/admin')}>
            <Text style={[styles.breadcrumbText, { color: colors.primary }]}>
              {language === 'ar' ? 'لوحة التحكم' : 'Admin'}
            </Text>
          </TouchableOpacity>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.textSecondary} />
          <Text style={[styles.breadcrumbText, { color: colors.textSecondary }]}>
            {language === 'ar' ? 'الموديلات' : 'Models'}
          </Text>
        </View>

        {/* Add New Form */}
        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.formTitle, { color: colors.text }]}>
            {language === 'ar' ? 'إضافة موديل جديد' : 'Add New Model'}
          </Text>

          {/* Model Image Upload */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              {language === 'ar' ? 'صورة الموديل' : 'Model Image'}
            </Text>
            
            <View style={styles.imageUploadSection}>
              {modelImage ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: modelImage }} style={styles.modelImagePreview} />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => setModelImage(null)}
                  >
                    <Ionicons name="close-circle" size={24} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.uploadBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={pickImage}
                >
                  <Ionicons name="camera" size={32} color={colors.primary} />
                  <Text style={[styles.uploadBtnText, { color: colors.primary }]}>
                    {language === 'ar' ? 'اختر صورة' : 'Pick Image'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {!modelImage && (
              <View style={styles.urlInputSection}>
                <Text style={[styles.orText, { color: colors.textSecondary }]}>
                  {language === 'ar' ? 'أو أدخل رابط الصورة' : 'Or enter image URL'}
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={imageUrl}
                  onChangeText={setImageUrl}
                  placeholder="https://example.com/model.png"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              {language === 'ar' ? 'اختر الماركة *' : 'Select Brand *'}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.brandSelector}>
              {brands.map((brand) => (
                <TouchableOpacity
                  key={brand.id}
                  style={[
                    styles.brandChip,
                    { backgroundColor: selectedBrandId === brand.id ? colors.primary : colors.surface, borderColor: colors.border }
                  ]}
                  onPress={() => setSelectedBrandId(brand.id)}
                >
                  <Text style={{ color: selectedBrandId === brand.id ? '#FFF' : colors.text }}>
                    {language === 'ar' ? brand.name_ar : brand.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              {language === 'ar' ? 'الاسم (بالإنجليزية) *' : 'Name (English) *'}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={name}
              onChangeText={setName}
              placeholder={language === 'ar' ? 'مثال: Camry' : 'e.g., Camry'}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              {language === 'ar' ? 'الاسم (بالعربية) *' : 'Name (Arabic) *'}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }, isRTL && styles.inputRTL]}
              value={nameAr}
              onChangeText={setNameAr}
              placeholder={language === 'ar' ? 'مثال: كامري' : 'e.g., كامري'}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.text }]}>
                {language === 'ar' ? 'من سنة' : 'Year From'}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={yearFrom}
                onChangeText={setYearFrom}
                placeholder="2020"
                keyboardType="numeric"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={[styles.formGroup, { flex: 1, marginLeft: 12 }]}>
              <Text style={[styles.label, { color: colors.text }]}>
                {language === 'ar' ? 'إلى سنة' : 'Year To'}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={yearTo}
                onChangeText={setYearTo}
                placeholder="2024"
                keyboardType="numeric"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: showSuccess ? '#10b981' : colors.primary }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : showSuccess ? (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                <Text style={styles.saveButtonText}>
                  {language === 'ar' ? 'تم الحفظ بنجاح' : 'Saved Successfully'}
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="save" size={20} color="#FFF" />
                <Text style={styles.saveButtonText}>
                  {language === 'ar' ? 'حفظ' : 'Save'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Existing Models List */}
        <View style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.listTitle, { color: colors.text }]}>
            {language === 'ar' ? 'الموديلات الحالية' : 'Existing Models'} ({models.length})
          </Text>

          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : models.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {language === 'ar' ? 'لا توجد موديلات' : 'No models found'}
            </Text>
          ) : (
            models.map((model) => (
              <View key={model.id} style={[styles.listItem, { borderColor: colors.border }]}>
                {model.image_url ? (
                  <Image source={{ uri: model.image_url }} style={styles.modelThumb} />
                ) : (
                  <View style={[styles.modelIcon, { backgroundColor: colors.primary + '20' }]}>
                    <Ionicons name="layers" size={20} color={colors.primary} />
                  </View>
                )}
                <View style={styles.modelInfo}>
                  <Text style={[styles.modelName, { color: colors.text }]}>{model.name}</Text>
                  <Text style={[styles.modelMeta, { color: colors.textSecondary }]}>
                    {getBrandName(model.brand_id)} {model.year_start && model.year_end ? `(${model.year_start}-${model.year_end})` : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.deleteButton, { backgroundColor: colors.error + '20' }]}
                  onPress={() => handleDelete(model.id)}
                >
                  <Ionicons name="trash" size={18} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  contentContainer: { padding: 16 },
  breadcrumb: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  breadcrumbRTL: { flexDirection: 'row-reverse' },
  breadcrumbText: { fontSize: 14 },
  formCard: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 16 },
  formTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  inputRTL: { textAlign: 'right' },
  row: { flexDirection: 'row' },
  imageUploadSection: { alignItems: 'center', marginBottom: 12 },
  uploadBtn: { width: '100%', height: 100, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  uploadBtnText: { fontSize: 12, marginTop: 4, fontWeight: '500' },
  imagePreviewContainer: { position: 'relative', width: '100%' },
  modelImagePreview: { width: '100%', height: 120, borderRadius: 12 },
  removeImageBtn: { position: 'absolute', top: -8, right: -8 },
  urlInputSection: { marginTop: 8 },
  orText: { fontSize: 12, textAlign: 'center', marginBottom: 8 },
  brandSelector: { flexDirection: 'row' },
  brandChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  errorText: { color: '#ef4444', fontSize: 14, marginBottom: 12 },
  saveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 8, gap: 8 },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  listCard: { borderRadius: 12, borderWidth: 1, padding: 16 },
  listTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  emptyText: { textAlign: 'center', padding: 20 },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  modelIcon: { width: 48, height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  modelThumb: { width: 48, height: 48, borderRadius: 8 },
  modelInfo: { flex: 1, marginLeft: 12 },
  modelName: { fontSize: 16, fontWeight: '600' },
  modelMeta: { fontSize: 13, marginTop: 2 },
  deleteButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
