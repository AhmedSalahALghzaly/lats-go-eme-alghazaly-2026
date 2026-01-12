import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { useTranslation } from '../../src/hooks/useTranslation';
import { productBrandsApi } from '../../src/services/api';
import { useAdminSync } from '../../src/services/adminSyncService';
import { Header } from '../../src/components/Header';
import { ImageUploader } from '../../src/components/ui/ImageUploader';
import { Toast } from '../../src/components/ui/FormFeedback';

export default function ProductBrandsAdmin() {
  const { colors } = useTheme();
  const { language, isRTL } = useTranslation();
  const router = useRouter();
  
  // Admin Sync Service for Local-First Updates
  const adminSync = useAdminSync();

  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [countryOfOrigin, setCountryOfOrigin] = useState('');
  const [countryOfOriginAr, setCountryOfOriginAr] = useState('');
  const [logoImage, setLogoImage] = useState<string>('');

  // Edit mode state
  const [editingBrand, setEditingBrand] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      const response = await productBrandsApi.getAll();
      setBrands(response.data || []);
    } catch (error) {
      console.error('Error fetching brands:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter brands based on search query
  const filteredBrands = useMemo(() => {
    if (!searchQuery.trim()) return brands;
    const query = searchQuery.toLowerCase();
    return brands.filter((brand) => {
      const name = (brand.name || '').toLowerCase();
      const nameAr = (brand.name_ar || '').toLowerCase();
      const country = (brand.country_of_origin || '').toLowerCase();
      return name.includes(query) || nameAr.includes(query) || country.includes(query);
    });
  }, [brands, searchQuery]);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const resetForm = () => {
    setName('');
    setNameAr('');
    setCountryOfOrigin('');
    setCountryOfOriginAr('');
    setLogoImage('');
    setError('');
    setIsEditMode(false);
    setEditingBrand(null);
  };

  const handleEditBrand = (brand: any) => {
    // Populate form with brand data
    setName(brand.name || '');
    setNameAr(brand.name_ar || '');
    setCountryOfOrigin(brand.country_of_origin || '');
    setCountryOfOriginAr(brand.country_of_origin_ar || '');
    setLogoImage(brand.logo || '');
    setEditingBrand(brand);
    setIsEditMode(true);
    setError('');
  };

  const handleSave = async () => {
    if (!name.trim() || !nameAr.trim()) {
      showToast(language === 'ar' ? 'يرجى إدخال الاسم بالإنجليزية والعربية' : 'Please enter name in both languages', 'error');
      return;
    }

    setSaving(true);
    setError('');

    const brandData = {
      name: name.trim(),
      name_ar: nameAr.trim(),
      logo: logoImage || null,
      country_of_origin: countryOfOrigin.trim() || null,
      country_of_origin_ar: countryOfOriginAr.trim() || null,
    };

    try {
      let result;
      
      if (isEditMode && editingBrand) {
        // Update existing brand
        result = await adminSync.updateProductBrand(editingBrand.id, brandData);
        
        if (result.success) {
          setBrands(prev => prev.map(b => 
            b.id === editingBrand.id ? { ...b, ...brandData, ...result.data } : b
          ));
          showToast(language === 'ar' ? 'تم تحديث الماركة بنجاح' : 'Brand updated successfully', 'success');
        } else {
          showToast(result.error || (language === 'ar' ? 'فشل في تحديث الماركة' : 'Failed to update brand'), 'error');
        }
      } else {
        // Create new brand using optimistic update via AdminSyncService
        result = await adminSync.createProductBrand(brandData);
        
        if (result.success) {
          showToast(language === 'ar' ? 'تم إضافة الماركة بنجاح' : 'Brand created successfully', 'success');
          // Refresh to get server data with ID
          fetchBrands();
        } else {
          showToast(result.error || (language === 'ar' ? 'فشل في حفظ الماركة' : 'Failed to save brand'), 'error');
        }
      }

      if (result.success) {
        setShowSuccess(true);
        resetForm();
        setTimeout(() => setShowSuccess(false), 2000);
      }
    } catch (error: any) {
      showToast(language === 'ar' ? 'فشل في حفظ الماركة' : 'Failed to save brand', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    // Optimistic delete - remove from UI immediately
    const brandToDelete = brands.find(b => b.id === id);
    setBrands(prev => prev.filter(b => b.id !== id));
    
    try {
      const result = await adminSync.deleteProductBrand(id);
      
      if (!result.success) {
        // Rollback - re-add the brand
        if (brandToDelete) {
          setBrands(prev => [...prev, brandToDelete]);
        }
        showToast(result.error || (language === 'ar' ? 'فشل في حذف الماركة' : 'Failed to delete brand'), 'error');
      } else {
        showToast(language === 'ar' ? 'تم حذف الماركة بنجاح' : 'Brand deleted successfully', 'success');
      }
    } catch (error) {
      // Rollback on error
      if (brandToDelete) {
        setBrands(prev => [...prev, brandToDelete]);
      }
      console.error('Error deleting brand:', error);
      showToast(language === 'ar' ? 'فشل في حذف الماركة' : 'Failed to delete brand', 'error');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Header title={language === 'ar' ? 'ماركات المنتجات' : 'Product Brands'} showBack showSearch={false} showCart={false} />

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
            {language === 'ar' ? 'ماركات المنتجات' : 'Product Brands'}
          </Text>
        </View>

        {/* Add/Edit Form */}
        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: isEditMode ? colors.primary : colors.border }]}>
          <View style={styles.formTitleRow}>
            <Text style={[styles.formTitle, { color: isEditMode ? colors.primary : colors.text }]}>
              {isEditMode 
                ? (language === 'ar' ? 'تعديل الماركة' : 'Edit Brand')
                : (language === 'ar' ? 'إضافة ماركة جديدة' : 'Add New Brand')
              }
            </Text>
            {isEditMode && (
              <TouchableOpacity
                style={[styles.cancelEditBtn, { backgroundColor: colors.error + '20' }]}
                onPress={resetForm}
              >
                <Ionicons name="close" size={18} color={colors.error} />
                <Text style={[styles.cancelEditText, { color: colors.error }]}>
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Logo Upload Section */}
          <View style={styles.formGroup}>
            <ImageUploader
              mode="single"
              value={logoImage}
              onChange={(newImage) => setLogoImage(newImage as string)}
              size="medium"
              shape="circle"
              label={language === 'ar' ? 'شعار الماركة' : 'Brand Logo'}
              hint={language === 'ar' ? 'اختر صورة الشعار' : 'Choose logo image'}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              {language === 'ar' ? 'الاسم (بالإنجليزية) *' : 'Name (English) *'}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={name}
              onChangeText={setName}
              placeholder={language === 'ar' ? 'مثال: Bosch' : 'e.g., Bosch'}
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
              placeholder={language === 'ar' ? 'مثال: بوش' : 'e.g., بوش'}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          {/* Country of Origin Section */}
          <View style={[styles.formSection, { borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.primary }]}>
              <Ionicons name="flag" size={14} /> {language === 'ar' ? 'بلد المنشأ' : 'Country of Origin'}
            </Text>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                {language === 'ar' ? 'البلد (بالإنجليزية)' : 'Country (English)'}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={countryOfOrigin}
                onChangeText={setCountryOfOrigin}
                placeholder={language === 'ar' ? 'مثال: Germany' : 'e.g., Germany'}
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                {language === 'ar' ? 'البلد (بالعربية)' : 'Country (Arabic)'}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }, isRTL && styles.inputRTL]}
                value={countryOfOriginAr}
                onChangeText={setCountryOfOriginAr}
                placeholder={language === 'ar' ? 'مثال: ألمانيا' : 'e.g., ألمانيا'}
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
                <Ionicons name={isEditMode ? "create" : "save"} size={20} color="#FFF" />
                <Text style={styles.saveButtonText}>
                  {isEditMode 
                    ? (language === 'ar' ? 'تحديث' : 'Update')
                    : (language === 'ar' ? 'حفظ' : 'Save')
                  }
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Existing Brands List */}
        <View style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.listTitle, { color: colors.text }]}>
            {language === 'ar' ? 'الماركات الحالية' : 'Existing Brands'} ({filteredBrands.length})
          </Text>

          {/* Search Bar */}
          <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={language === 'ar' ? 'ابحث بالاسم أو البلد...' : 'Search by name or country...'}
              placeholderTextColor={colors.textSecondary}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : filteredBrands.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {searchQuery ? (language === 'ar' ? 'لا توجد نتائج' : 'No results found') : (language === 'ar' ? 'لا توجد ماركات' : 'No brands found')}
            </Text>
          ) : (
            filteredBrands.map((brand) => (
              <View key={brand.id} style={[styles.listItem, { borderColor: colors.border }]}>
                {brand.logo ? (
                  <Image source={{ uri: brand.logo }} style={styles.brandLogo} />
                ) : (
                  <View style={[styles.brandIcon, { backgroundColor: colors.primary + '20' }]}>
                    <Ionicons name="pricetag" size={24} color={colors.primary} />
                  </View>
                )}
                <View style={styles.brandInfo}>
                  <Text style={[styles.brandName, { color: colors.text }]}>
                    {language === 'ar' ? brand.name_ar || brand.name : brand.name}
                  </Text>
                  {(brand.country_of_origin || brand.country_of_origin_ar) && (
                    <View style={styles.countryRow}>
                      <Ionicons name="flag" size={12} color={colors.textSecondary} />
                      <Text style={[styles.countryText, { color: colors.textSecondary }]}>
                        {language === 'ar' ? brand.country_of_origin_ar || brand.country_of_origin : brand.country_of_origin}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.editButton, { backgroundColor: colors.primary + '20' }]}
                    onPress={() => handleEditBrand(brand)}
                  >
                    <Ionicons name="create" size={18} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.deleteButton, { backgroundColor: colors.error + '20' }]}
                    onPress={() => handleDelete(brand.id)}
                  >
                    <Ionicons name="trash" size={18} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
      
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onDismiss={() => setToastVisible(false)}
      />
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
  formTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  formTitle: { fontSize: 18, fontWeight: '700' },
  cancelEditBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 4 },
  cancelEditText: { fontSize: 14, fontWeight: '600' },
  formGroup: { marginBottom: 16 },
  formSection: { borderTopWidth: 1, paddingTop: 16, marginTop: 8, marginBottom: 16 },
  sectionLabel: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  inputRTL: { textAlign: 'right' },
  imageUploadSection: { alignItems: 'center', marginBottom: 12 },
  uploadBtn: { width: 120, height: 120, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  uploadBtnText: { fontSize: 12, marginTop: 4, fontWeight: '500' },
  imagePreviewContainer: { position: 'relative' },
  logoPreview: { width: 120, height: 120, borderRadius: 12 },
  removeImageBtn: { position: 'absolute', top: -8, right: -8 },
  urlInputSection: { marginTop: 8 },
  orText: { fontSize: 12, textAlign: 'center', marginBottom: 8 },
  errorText: { color: '#ef4444', fontSize: 14, marginBottom: 12 },
  saveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 8, gap: 8 },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  listCard: { borderRadius: 12, borderWidth: 1, padding: 16 },
  listTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  // Search Bar Styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  emptyText: { textAlign: 'center', padding: 20 },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
  brandLogo: { width: 56, height: 56, borderRadius: 28 },
  brandIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  brandInfo: { flex: 1, marginLeft: 12 },
  brandName: { fontSize: 16, fontWeight: '600' },
  countryRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  countryText: { fontSize: 13 },
  actionButtons: { flexDirection: 'column', gap: 8 },
  editButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  deleteButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
