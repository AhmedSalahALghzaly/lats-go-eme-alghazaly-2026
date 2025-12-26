import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  ScrollView,
  ImageBackground,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from '../hooks/useTranslation';
import { useTheme } from '../hooks/useTheme';

const { width } = Dimensions.get('window');
const SLIDER_WIDTH = width - 40;

// Offer images - optimized URLs
const OFFER_IMAGES = [
  'https://customer-assets.emergentagent.com/job_run-al-project/artifacts/04kxu3h3_car-brake-parts-and-components-displayed-on-a-whit-2025-12-08-16-53-24-utc.jpg',
  'https://customer-assets.emergentagent.com/job_run-al-project/artifacts/e0wpx2r9_car-parts-2025-02-25-15-02-08-utc.jpg',
  'https://customer-assets.emergentagent.com/job_run-al-project/artifacts/yt3zfrnf_car-parts-2025-02-24-20-10-48-utc%20%282%29.jpg',
];

// Dynamic offers with discount tiers:
// >100 EGP = 10%, >500 EGP = 13%, >1000 EGP = 15%
export const offers = [
  {
    id: 'offer-1',
    title: 'Brake System Bundle',
    title_ar: 'حزمة نظام الفرامل',
    subtitle: 'Oil Filter + Air Filter + Spark Plugs',
    subtitle_ar: 'فلتر زيت + فلتر هواء + شمعات',
    car: 'Toyota Camry (2018-2024)',
    car_ar: 'تويوتا كامري (2018-2024)',
    car_model_id: 'cm_camry',
    gradient: ['rgba(102, 126, 234, 0.85)', 'rgba(118, 75, 162, 0.9)'],
    overlayGradient: ['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.75)'],
    products: ['prod_oil_filter_1', 'prod_air_filter_1', 'prod_spark_plug_1'],
    originalPrice: 171.48,
    get discount() {
      if (this.originalPrice > 1000) return 15;
      if (this.originalPrice > 500) return 13;
      if (this.originalPrice > 100) return 10;
      return 0;
    },
    get finalPrice() {
      return +(this.originalPrice * (1 - this.discount / 100)).toFixed(2);
    },
    image: OFFER_IMAGES[0],
    accentColor: '#667EEA',
    iconBg: '#FF6B35',
  },
  {
    id: 'offer-2',
    title: 'Power Pack Bundle',
    title_ar: 'حزمة الطاقة المتكاملة',
    subtitle: 'Shock Absorber + Battery + Oil Filter',
    subtitle_ar: 'ممتص صدمات + بطارية + فلتر زيت',
    car: 'Toyota Hilux (2016-2024)',
    car_ar: 'تويوتا هايلكس (2016-2024)',
    car_model_id: 'cm_hilux',
    gradient: ['rgba(17, 153, 142, 0.85)', 'rgba(56, 239, 125, 0.9)'],
    overlayGradient: ['rgba(0,0,0,0.25)', 'rgba(0,0,0,0.7)'],
    products: ['prod_shock_1', 'prod_battery_1', 'prod_oil_filter_1'],
    originalPrice: 355.99,
    get discount() {
      if (this.originalPrice > 1000) return 15;
      if (this.originalPrice > 500) return 13;
      if (this.originalPrice > 100) return 10;
      return 0;
    },
    get finalPrice() {
      return +(this.originalPrice * (1 - this.discount / 100)).toFixed(2);
    },
    image: OFFER_IMAGES[1],
    accentColor: '#11998E',
    iconBg: '#FFD93D',
  },
  {
    id: 'offer-3',
    title: 'Premium Combo Deal',
    title_ar: 'صفقة الكومبو المميزة',
    subtitle: 'Battery + Spark Plugs + Air Filter',
    subtitle_ar: 'بطارية + شمعات + فلتر هواء',
    car: 'Mitsubishi Lancer (2015-2020)',
    car_ar: 'ميتسوبيشي لانسر (2015-2020)',
    car_model_id: 'cm_lancer',
    gradient: ['rgba(255, 107, 107, 0.85)', 'rgba(255, 142, 83, 0.9)'],
    overlayGradient: ['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.65)'],
    products: ['prod_battery_1', 'prod_spark_plug_1', 'prod_air_filter_1'],
    originalPrice: 310.49,
    get discount() {
      if (this.originalPrice > 1000) return 15;
      if (this.originalPrice > 500) return 13;
      if (this.originalPrice > 100) return 10;
      return 0;
    },
    get finalPrice() {
      return +(this.originalPrice * (1 - this.discount / 100)).toFixed(2);
    },
    image: OFFER_IMAGES[2],
    accentColor: '#FF6B6B',
    iconBg: '#4ECDC4',
  },
];

interface OfferSliderProps {
  compact?: boolean;
  showArrows?: boolean;
  hideIcon?: boolean;
  onOfferChange?: (index: number) => void;
  initialIndex?: number;
}

export const OfferSlider: React.FC<OfferSliderProps> = ({ 
  compact = false, 
  showArrows = false,
  hideIcon = false,
  onOfferChange,
  initialIndex = 0,
}) => {
  const router = useRouter();
  const { language } = useTranslation();
  const { colors, isDark } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  
  // Animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const arrowLeftAnim = useRef(new Animated.Value(0)).current;
  const arrowRightAnim = useRef(new Animated.Value(0)).current;

  // Auto-scroll only on home page (not compact)
  useEffect(() => {
    if (compact) return;
    const interval = setInterval(() => {
      const nextIndex = (currentIndex + 1) % offers.length;
      scrollRef.current?.scrollTo({ x: nextIndex * (SLIDER_WIDTH + 12), animated: true });
      setCurrentIndex(nextIndex);
      onOfferChange?.(nextIndex);
    }, 5000);
    return () => clearInterval(interval);
  }, [currentIndex, compact]);

  // Pulse animation for icon
  useEffect(() => {
    if (hideIcon) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [hideIcon]);

  // Glow animation
  useEffect(() => {
    if (hideIcon) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, [hideIcon]);

  // Rotation animation for icon
  useEffect(() => {
    if (hideIcon) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, { toValue: 1, duration: 4000, useNativeDriver: true }),
        Animated.timing(rotateAnim, { toValue: 0, duration: 4000, useNativeDriver: true }),
      ])
    ).start();
  }, [hideIcon]);

  const handleScroll = (event: any) => {
    const x = event.nativeEvent.contentOffset.x;
    const index = Math.round(x / (SLIDER_WIDTH + 12));
    if (index !== currentIndex && index >= 0 && index < offers.length) {
      setCurrentIndex(index);
      onOfferChange?.(index);
    }
  };

  const goToSlide = (index: number) => {
    scrollRef.current?.scrollTo({ x: index * (SLIDER_WIDTH + 12), animated: true });
    setCurrentIndex(index);
    onOfferChange?.(index);
  };

  const handlePrevious = () => {
    const prevIndex = currentIndex === 0 ? offers.length - 1 : currentIndex - 1;
    goToSlide(prevIndex);
    Animated.sequence([
      Animated.timing(arrowLeftAnim, { toValue: -8, duration: 120, useNativeDriver: true }),
      Animated.timing(arrowLeftAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
    ]).start();
  };

  const handleNext = () => {
    const nextIndex = (currentIndex + 1) % offers.length;
    goToSlide(nextIndex);
    Animated.sequence([
      Animated.timing(arrowRightAnim, { toValue: 8, duration: 120, useNativeDriver: true }),
      Animated.timing(arrowRightAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
    ]).start();
  };

  const handleIconPress = (offerId: string) => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.85, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1.1, duration: 120, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start(() => {
      router.push(`/offer/${offerId}`);
    });
  };

  const getTitle = (offer: typeof offers[0]) => language === 'ar' ? offer.title_ar : offer.title;
  const getSubtitle = (offer: typeof offers[0]) => language === 'ar' ? offer.subtitle_ar : offer.subtitle;
  const getCar = (offer: typeof offers[0]) => language === 'ar' ? offer.car_ar : offer.car;

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.9],
  });

  // Increased height for better visibility
  const slideHeight = compact ? 195 : 195;

  return (
    <View style={styles.container}>
      {/* Navigation Arrows */}
      {showArrows && (
        <TouchableOpacity 
          style={[styles.arrowButton, styles.arrowLeft, { backgroundColor: offers[currentIndex].accentColor }]}
          onPress={handlePrevious}
          activeOpacity={0.8}
        >
          <Animated.View style={{ transform: [{ translateX: arrowLeftAnim }] }}>
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </Animated.View>
        </TouchableOpacity>
      )}

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={SLIDER_WIDTH + 12}
      >
        {offers.map((offer, index) => (
          <TouchableOpacity 
            key={offer.id} 
            style={[styles.slideWrapper, { width: SLIDER_WIDTH }]}
            activeOpacity={hideIcon ? 1 : 0.95}
            onPress={hideIcon ? undefined : () => router.push(`/offer/${offer.id}`)}
          >
            <ImageBackground
              source={{ uri: offer.image }}
              style={[styles.slide, { height: slideHeight }]}
              imageStyle={styles.slideImage}
              resizeMode="cover"
            >
              {/* Gradient Overlay */}
              <LinearGradient
                colors={offer.overlayGradient as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.2, y: 1 }}
                style={styles.gradientOverlay}
              >
                {/* Accent Strip */}
                <View style={[styles.accentStrip, { backgroundColor: offer.accentColor }]} />
                
                {/* Content Container */}
                <View style={styles.contentContainer}>
                  {/* Center Section - Title, Car Model, Products - Centered at top */}
                  <View style={styles.centerSection}>
                    {/* Title */}
                    <Text style={styles.titleText} numberOfLines={1}>
                      {getTitle(offer)}
                    </Text>
                    
                    {/* Car Badge - Centered below title */}
                    <View style={[styles.carBadge, { backgroundColor: offer.accentColor }]}>
                      <MaterialCommunityIcons name="car-sports" size={14} color="#FFF" />
                      <Text style={styles.carText} numberOfLines={1}>
                        {getCar(offer)}
                      </Text>
                    </View>
                    
                    {/* Subtitle (Parts names) - Centered below car badge */}
                    <Text style={styles.subtitleText} numberOfLines={1}>
                      {getSubtitle(offer)}
                    </Text>
                  </View>

                  {/* Right Side - Discount & Action */}
                  <View style={styles.actionSection}>
                    {/* Discount Badge */}
                    <LinearGradient
                      colors={[offer.accentColor, offer.iconBg]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.discountBadge}
                    >
                      <Text style={styles.discountNum}>{offer.discount}%</Text>
                      <Text style={styles.discountLabel}>{language === 'ar' ? 'خصم' : 'OFF'}</Text>
                    </LinearGradient>

                    {/* Interactive Action Icon - Directly below discount badge */}
                    {!hideIcon && (
                      <TouchableOpacity
                        onPress={() => handleIconPress(offer.id)}
                        activeOpacity={0.7}
                        style={styles.iconWrapper}
                      >
                        <Animated.View 
                          style={[
                            styles.actionIcon,
                            { 
                              backgroundColor: offer.iconBg,
                              transform: [
                                { scale: index === currentIndex ? pulseAnim : 1 },
                              ],
                            }
                          ]}
                        >
                          {/* Glow Effect */}
                          <Animated.View 
                            style={[
                              styles.iconGlow,
                              { 
                                backgroundColor: offer.iconBg,
                                opacity: glowOpacity,
                              }
                            ]} 
                          />
                          {/* Icon */}
                          <Animated.View style={{ transform: [{ rotate: spin }] }}>
                            <MaterialCommunityIcons 
                              name="lightning-bolt-circle" 
                              size={24} 
                              color="#1a1a2e" 
                            />
                          </Animated.View>
                        </Animated.View>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Price Row - Positioned at bottom of image */}
                <View style={styles.priceRow}>
                  <Text style={styles.oldPrice}>{offer.originalPrice.toFixed(2)} ج.م</Text>
                  <View style={styles.arrowIcon}>
                    <Ionicons name="arrow-forward" size={14} color="rgba(255,255,255,0.6)" />
                  </View>
                  <Text style={[styles.newPrice, { color: offer.iconBg }]}>
                    {offer.finalPrice.toFixed(2)} <Text style={styles.currency}>ج.م</Text>
                  </Text>
                </View>
              </LinearGradient>
            </ImageBackground>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Navigation Arrows - Right */}
      {showArrows && (
        <TouchableOpacity 
          style={[styles.arrowButton, styles.arrowRight, { backgroundColor: offers[currentIndex].accentColor }]}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Animated.View style={{ transform: [{ translateX: arrowRightAnim }] }}>
            <Ionicons name="chevron-forward" size={22} color="#FFF" />
          </Animated.View>
        </TouchableOpacity>
      )}

      {/* Pagination Dots */}
      <View style={styles.dotsRow}>
        {offers.map((offer, i) => (
          <TouchableOpacity key={i} onPress={() => goToSlide(i)}>
            <View 
              style={[
                styles.singleDot, 
                { backgroundColor: isDark ? '#555' : '#DDD' },
                i === currentIndex && { 
                  width: 26, 
                  backgroundColor: offer.accentColor,
                }
              ]} 
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    position: 'relative',
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  slideWrapper: {
    marginRight: 12,
  },
  slide: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
  },
  slideImage: {
    borderRadius: 18,
  },
  gradientOverlay: {
    flex: 1,
    borderRadius: 18,
    position: 'relative',
  },
  accentStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    paddingLeft: 18,
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingRight: 12,
  },
  mainSection: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingRight: 12,
  },
  titleText: {
    color: '#FFD93D',
    fontSize: 19,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
    letterSpacing: 0.3,
    textAlign: 'center',
    marginBottom: 0,
  },
  subtitleText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 0,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    textAlign: 'center',
  },
  carBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    alignSelf: 'center',
    gap: 6,
    marginTop: 0,
    marginBottom: 0,
  },
  carText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    bottom: 16,
    right: 18,
    gap: 8,
  },
  oldPrice: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    textDecorationLine: 'line-through',
  },
  arrowIcon: {
    opacity: 0.6,
  },
  newPrice: {
    fontSize: 20,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  currency: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionSection: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    minWidth: 65,
    height: '100%',
    paddingTop: 0,
  },
  discountBadge: {
    paddingHorizontal: 14,
    paddingVertical: 17,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 65,
    marginBottom: 15,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
      },
      default: {
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
    }),
  },
  discountNum: {
    color: '#1a1a2e',
    fontSize: 20,
    fontWeight: '900',
  },
  discountLabel: {
    color: '#1a1a2e',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  iconWrapper: {
    alignItems: 'center',
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...Platform.select({
      web: {
        boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
      },
      default: {
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
    }),
  },
  iconGlow: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  iconLabel: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
    gap: 10,
  },
  singleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  arrowButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
      },
      default: {
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
    }),
  },
  arrowLeft: {
    left: 6,
  },
  arrowRight: {
    right: 6,
  },
});
